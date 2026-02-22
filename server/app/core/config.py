from functools import lru_cache
from typing import Optional

# Load .env file before initializing settings
from dotenv import load_dotenv
from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings

load_dotenv()


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables or .env file
    """

    # Core
    PROJECT_NAME: str = "Fullstack Template API"
    API_V1_STR: str = "/api/v1"
    CORS_ALLOW_ORIGINS: str = ""

    # Database - Primary connection string
    DATABASE_URL: Optional[str] = None

    # Database - Component parts (used if DATABASE_URL is not provided)
    DB_USER: Optional[str] = None
    DB_PASSWORD: Optional[str] = None
    DB_HOST: Optional[str] = None
    DB_PORT: Optional[str] = None
    DB_NAME: Optional[str] = None

    # Clerk Authentication
    CLERK_JWT_ISSUER: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("CLERK_JWT_ISSUER", "CLERK_ISSUER"),
    )
    CLERK_AUDIENCE: Optional[str] = None
    CLERK_SECRET_KEY: Optional[str] = None

    model_config = {
        "case_sensitive": True,
        "env_file": ".env",
        "extra": "ignore",
    }

    def get_database_url(self) -> str:
        """
        Construct database URL from individual components if provided,
        otherwise return the DATABASE_URL
        """
        # If all individual DB components are present, construct the URL
        if all(
            [self.DB_USER, self.DB_PASSWORD, self.DB_HOST, self.DB_PORT, self.DB_NAME]
        ):
            return f"postgresql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

        if self.DATABASE_URL:
            return self.DATABASE_URL

        raise ValueError(
            "Database configuration missing. Set DATABASE_URL or all DB_* variables."
        )

    def get_cors_origins(self) -> list[str]:
        """
        Return configured CORS origins. Falls back to local dev origins.
        """
        if self.CORS_ALLOW_ORIGINS.strip():
            return [
                origin.strip()
                for origin in self.CORS_ALLOW_ORIGINS.split(",")
                if origin.strip()
            ]

        return ["http://localhost:3000", "http://127.0.0.1:3000"]


@lru_cache
def get_settings() -> Settings:
    """
    Get application settings as a cached singleton to avoid reloading for every request
    """
    return Settings()


# Create and export a singleton instance
settings = get_settings()
