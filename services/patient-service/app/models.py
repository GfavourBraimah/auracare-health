"""
SQLAlchemy ORM models for the Patient Records Service.
"""
from sqlalchemy import Column, Date, Integer, String, Text

from app.database import Base


class Patient(Base):
    """
    Represents a single patient record.

    Note: medical_history and other PHI fields should be encrypted at rest
    at the storage/volume layer (e.g. encrypted EBS/RDS storage) and access
    to this table should be restricted and audited per HIPAA requirements.
    """

    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    dob = Column(Date, nullable=False)
    medical_history = Column(Text, nullable=True)
