"""
Pydantic schemas for request/response validation.
"""
from datetime import date

from pydantic import BaseModel, ConfigDict, field_validator

MIN_NAME_LENGTH = 2
MAX_PATIENT_AGE_YEARS = 130


class PatientBase(BaseModel):
    name: str
    dob: date
    medical_history: str | None = None

    @field_validator("name")
    @classmethod
    def name_must_be_reasonable(cls, value: str) -> str:
        cleaned = value.strip()
        if len(cleaned) < MIN_NAME_LENGTH:
            raise ValueError(f"Name must be at least {MIN_NAME_LENGTH} characters long.")
        return cleaned

    @field_validator("dob")
    @classmethod
    def dob_must_be_valid(cls, value: date) -> date:
        today = date.today()
        if value > today:
            raise ValueError("Date of birth cannot be in the future.")
        earliest = today.replace(year=today.year - MAX_PATIENT_AGE_YEARS)
        if value < earliest:
            raise ValueError(
                f"Date of birth cannot be more than {MAX_PATIENT_AGE_YEARS} years ago."
            )
        return value


class PatientCreate(PatientBase):
    pass


class PatientResponse(PatientBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
