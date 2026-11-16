import os
from typing import Generator
from sqlmodel import SQLModel, Session, create_engine

# Database file path in the workspace root or backend folder
DB_FILE = os.getenv("DATABASE_FILE", "bank_monitor.db")
DATABASE_URL = f"sqlite:///{DB_FILE}"

# connect_args={"check_same_thread": False} is required for SQLite with FastAPI multi-threading
engine = create_engine(
    DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False}
)


def init_db() -> None:
    """Create all database tables defined in SQLModel models."""
    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    """FastAPI dependency to yield a database session per request."""
    with Session(engine) as session:
        yield session

