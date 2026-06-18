import re
from typing import Optional

from sqlalchemy import Engine, create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import QueuePool
from app.core.config import settings
import logging
from sqlalchemy.exc import ProgrammingError, OperationalError

logger = logging.getLogger(__name__)
DB_NAME_PATTERN = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
engine: Optional[Engine] = None
SessionLocal: Optional[sessionmaker[Session]] = None


def initialize_database():
    """Initialize the database connection and session factory."""
    global engine, SessionLocal

    if engine is not None and SessionLocal is not None:
        return engine, SessionLocal

    database_url = settings.get_database_url()
    parsed_url = make_url(database_url)

    try:
        masked_url = parsed_url.render_as_string(hide_password=True)
        logger.info(f"Connecting to database at: {masked_url}")

        is_postgres = parsed_url.drivername.startswith("postgres")
        if is_postgres:
            db_engine = create_engine(
                database_url,
                pool_size=5,
                max_overflow=10,
                pool_pre_ping=True,
                poolclass=QueuePool,
            )
        else:
            db_engine = create_engine(database_url)

        # Create session factory
        session_factory = sessionmaker(
            autocommit=False, autoflush=False, bind=db_engine
        )

        # Test the connection
        with db_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            logger.info("Database connection established successfully")

        engine = db_engine
        SessionLocal = session_factory
        return engine, SessionLocal

    except (OperationalError, ProgrammingError) as e:
        # Handle database doesn't exist case
        if "does not exist" in str(e) and parsed_url.drivername.startswith("postgres"):
            try:
                create_postgres_database(database_url)
                # Try initialization again after creating database
                return initialize_database()
            except Exception as db_create_error:
                logger.error(f"Failed to create database: {db_create_error}")
                raise
        logger.error(f"Database connection error: {e}")
        raise
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise


def create_postgres_database(url):
    """Create PostgreSQL database if it doesn't exist"""
    parsed_url = make_url(url)
    db_name = parsed_url.database
    if not db_name:
        raise ValueError("Database URL must include a database name")
    if not DB_NAME_PATTERN.fullmatch(db_name):
        raise ValueError(f"Invalid database name: {db_name}")

    # Connect to default postgres database
    postgres_url = parsed_url.set(database="postgres")
    engine = create_engine(postgres_url)

    with engine.connect() as conn:
        # Check if database exists
        conn.execute(text("COMMIT"))  # Close any open transaction
        result = conn.execute(
            text("SELECT 1 FROM pg_database WHERE datname = :db_name"),
            {"db_name": db_name},
        )
        if result.scalar() != 1:
            conn.execute(text("COMMIT"))
            conn.execute(text(f'CREATE DATABASE "{db_name}"'))
            logger.info(f"Created database {db_name}")


def get_session_factory() -> sessionmaker[Session]:
    """Return the initialized session factory, creating it if needed."""
    _, session_factory = initialize_database()
    return session_factory


# Dependency for routes
def get_db():
    """Dependency to get a database session"""
    db = get_session_factory()()
    try:
        yield db
    finally:
        db.close()
