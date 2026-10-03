"""
Database engine/session configuration for the Patient Records Service.

HIPAA compliance note:
Database credentials (including the full connection string) are NEVER
hardcoded or committed to source control. They are read exclusively from
the DATABASE_URL environment variable, which must be injected at runtime
by the deployment platform (e.g. ECS task secrets, Kubernetes Secret,
AWS Secrets Manager / Parameter Store). See .env.example for the expected
format for local development.
"""
import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.environ.get("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL environment variable is not set. "
        "Database credentials must be provided via environment variables only "
        "(see .env.example). Refusing to start without it."
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
