"""
Routes for the Patient Records Service.

All routes in this router are mounted under the /api/patients prefix
(see app/main.py).
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Patient
from app.schemas import PatientCreate, PatientResponse

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


@router.post("", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
def create_patient(patient: PatientCreate, db: Session = Depends(get_db)):
    db_patient = Patient(**patient.model_dump())
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)
    return db_patient


@router.get("", response_model=list[PatientResponse])
def list_patients(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(Patient).offset(skip).limit(limit).all()


@router.get("/{patient_id}", response_model=PatientResponse)
def get_patient(patient_id: int, db: Session = Depends(get_db)):
    db_patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if db_patient is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    return db_patient
