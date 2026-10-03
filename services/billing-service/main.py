"""
AuraCare Health - Billing Service

Entry point for the FastAPI application. All routes are mounted under
the /api/billing prefix, including /api/billing/health which is used as
the AWS ALB target group health check.

HIPAA / PCI-adjacent compliance note:
Database credentials (including the full connection string) are NEVER
hardcoded or committed to source control. They are read exclusively from
the DATABASE_URL environment variable, which must be injected at runtime
by the deployment platform (e.g. ECS task secrets, Kubernetes Secret,
AWS Secrets Manager / Parameter Store). See .env.example for the expected
format for local development.
"""
import os
from datetime import datetime, timezone
from enum import Enum

import httpx
from fastapi import APIRouter, Depends, FastAPI, HTTPException, status
from pydantic import BaseModel, ConfigDict, field_validator
from sqlalchemy import Column, DateTime, Float, Integer, String, create_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

DATABASE_URL = os.environ.get("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL environment variable is not set. "
        "Database credentials must be provided via environment variables only "
        "(see .env.example). Refusing to start without it."
    )

PATIENT_SERVICE_URL = os.environ.get("PATIENT_SERVICE_URL")

if not PATIENT_SERVICE_URL:
    raise RuntimeError(
        "PATIENT_SERVICE_URL environment variable is not set. "
        "Required to verify a patient exists before creating an invoice for them."
    )

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a DB session and ensures it is closed."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class InvoiceStatus(str, Enum):
    PENDING = "pending"
    PAID = "paid"
    VOID = "void"


class Invoice(Base):
    """
    Represents a single billing invoice tied to a patient.

    Note: this service stores financial records associated with patient
    care and must be treated as sensitive data under the same access
    control and audit requirements as PHI (encryption at rest, restricted
    and logged access).
    """

    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    patient_id = Column(Integer, nullable=False, index=True)
    amount = Column(Float, nullable=False)
    status = Column(String(20), nullable=False, default=InvoiceStatus.PENDING.value)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))


class InvoiceCreate(BaseModel):
    patient_id: int
    amount: float

    @field_validator("patient_id")
    @classmethod
    def patient_id_must_be_positive(cls, value: int) -> int:
        if value <= 0:
            raise ValueError("patient_id must be a positive integer.")
        return value

    @field_validator("amount")
    @classmethod
    def amount_must_be_positive(cls, value: float) -> float:
        if value <= 0:
            raise ValueError("amount must be greater than zero.")
        return value


class InvoiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: int
    amount: float
    status: InvoiceStatus
    created_at: datetime


# Create tables on startup if they do not already exist.
# For production, prefer a proper migration tool (e.g. Alembic) instead
# of relying on create_all.
Base.metadata.create_all(bind=engine)

router = APIRouter()


@router.get("/health", status_code=status.HTTP_200_OK, tags=["health"])
def health_check():
    """
    Liveness/readiness probe for the AWS ALB target group.

    Intentionally does not touch the database: a transient DB blip should
    not cause the ALB to pull a healthy instance out of rotation. Returns
    a static 200 OK as long as the process is up and serving requests.
    """
    return {"status": "ok"}


def _verify_patient_exists(patient_id: int) -> None:
    """
    Verifies patient_id refers to a real patient by calling the Patient
    Records Service. This is a cross-service referential integrity check:
    each service owns its own database, so there is no foreign key to
    enforce "you cannot invoice a patient who doesn't exist" at the
    database level. We enforce it here instead, at the API boundary,
    before the INSERT.
    """
    try:
        resp = httpx.get(f"{PATIENT_SERVICE_URL}/api/patients/{patient_id}", timeout=5.0)
    except httpx.RequestError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not verify patient_id against the Patient Service. Please try again.",
        )

    if resp.status_code == status.HTTP_404_NOT_FOUND:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"No patient found with id {patient_id}. "
                "Add the patient before creating an invoice for them."
            ),
        )

    if resp.status_code != status.HTTP_200_OK:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not verify patient_id against the Patient Service. Please try again.",
        )


@router.post("", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
def create_invoice(invoice: InvoiceCreate, db: Session = Depends(get_db)):
    # A patient must already exist before an invoice can be created for
    # them - you cannot bill someone who was never registered as a patient.
    _verify_patient_exists(invoice.patient_id)

    db_invoice = Invoice(patient_id=invoice.patient_id, amount=invoice.amount)
    db.add(db_invoice)
    db.commit()
    db.refresh(db_invoice)
    return db_invoice


@router.get("", response_model=list[InvoiceResponse])
def list_invoices(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(Invoice).offset(skip).limit(limit).all()


@router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(invoice_id: int, db: Session = Depends(get_db)):
    db_invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if db_invoice is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
    return db_invoice


app = FastAPI(
    title="AuraCare Health - Billing Service",
    version="1.0.0",
)

app.include_router(router, prefix="/api/billing", tags=["billing"])
