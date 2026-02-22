import re
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool
from app.core.config import settings
import logging
from sqlalchemy.exc import ProgrammingError, OperationalError

logger = logging.getLogger(__name__)
DB_NAME_PATTERN = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


def initialize_database():
    """Initialize the database connection and create tables"""
    try:
        # Get the database URL from settings
        database_url = settings.get_database_url()

        # Mask password for logging
        masked_url = database_url
        if settings.DB_PASSWORD:
            masked_url = database_url.replace(settings.DB_PASSWORD, "****")
        logger.info(f"Connecting to database at: {masked_url}")

        # Configure engine based on database type
        if "postgres" in database_url or "postgresql" in database_url:
            engine = create_engine(
                database_url,
                pool_size=5,
                max_overflow=10,
                pool_pre_ping=True,
                poolclass=QueuePool,
            )
        else:
            engine = create_engine(database_url)

        # Create session factory
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

        # Test the connection
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            logger.info("Database connection established successfully")

        # Create tables
        from app.models.models import User
        from app.db.base_class import Base

        # Create tables
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables initialized")

        return engine, SessionLocal

    except (OperationalError, ProgrammingError) as e:
        # Handle database doesn't exist case
        if "does not exist" in str(e) and (
            "postgres" in database_url or "postgresql" in database_url
        ):
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
    # Extract database name from URL
    db_name = url.split("/")[-1]
    if "?" in db_name:  # Handle connection parameters
        db_name = db_name.split("?")[0]
    if not DB_NAME_PATTERN.fullmatch(db_name):
        raise ValueError(f"Invalid database name: {db_name}")

    # Connect to default postgres database
    postgres_url = url.rsplit("/", 1)[0] + "/postgres"
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


# Initialize database connection and session factory
engine, SessionLocal = initialize_database()


# Dependency for routes
def get_db():
    """Dependency to get a database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
