"""
AuraCare Health - Patient Records Service

Entry point for the FastAPI application. All business routes are mounted
under the /api/patients prefix, including /api/patients/health which is
used as the AWS ALB target group health check.
"""
from fastapi import FastAPI

from app.database import Base, engine
from app.routers import patients

# Create tables on startup if they do not already exist.
# For production, prefer a proper migration tool (e.g. Alembic) instead
# of relying on create_all.
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AuraCare Health - Patient Records Service",
    version="1.0.0",
)

app.include_router(patients.router, prefix="/api/patients", tags=["patients"])
