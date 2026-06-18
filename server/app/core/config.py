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

    # Stripe Payments
    STRIPE_SECRET_KEY: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: Optional[str] = None
    STRIPE_DEFAULT_PRICE_ID: Optional[str] = None
    STRIPE_PAYMENT_MODE: str = "payment"
    STRIPE_SUCCESS_URL: Optional[str] = None
    STRIPE_CANCEL_URL: Optional[str] = None
    STRIPE_FRONTEND_URL: str = "http://localhost:3000"
    STRIPE_AUTOMATIC_TAX_ENABLED: bool = False

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

    def is_stripe_enabled(self) -> bool:
        """Return whether Stripe Checkout can be used."""
        return bool(
            self.STRIPE_SECRET_KEY
            and self.STRIPE_WEBHOOK_SECRET
            and self.STRIPE_DEFAULT_PRICE_ID
        )

    def get_stripe_payment_mode(self) -> str:
        """Return a Checkout-supported payment mode."""
        mode = self.STRIPE_PAYMENT_MODE.strip().lower()
        if mode not in {"payment", "subscription"}:
            raise ValueError("STRIPE_PAYMENT_MODE must be 'payment' or 'subscription'")
        return mode

    def get_stripe_success_url(self) -> str:
        if self.STRIPE_SUCCESS_URL:
            return self.STRIPE_SUCCESS_URL
        frontend_url = self.STRIPE_FRONTEND_URL or "http://localhost:3000"
        return (
            f"{frontend_url.rstrip('/')}"
            "/?checkout=success&session_id={CHECKOUT_SESSION_ID}"
        )

    def get_stripe_cancel_url(self) -> str:
        if self.STRIPE_CANCEL_URL:
            return self.STRIPE_CANCEL_URL
        frontend_url = self.STRIPE_FRONTEND_URL or "http://localhost:3000"
        return f"{frontend_url.rstrip('/')}/?checkout=canceled"


@lru_cache
def get_settings() -> Settings:
    """
    Get application settings as a cached singleton to avoid reloading for every request
    """
    return Settings()


# Create and export a singleton instance
settings = get_settings()
