import os
import unittest
from unittest.mock import patch

from app.core.config import Settings


class SettingsTests(unittest.TestCase):
    def test_get_database_url_prefers_composed_db_parts(self):
        settings = Settings(
            _env_file=None,
            DB_USER="postgres",
            DB_PASSWORD="secret",
            DB_HOST="localhost",
            DB_PORT="5432",
            DB_NAME="appdb",
        )

        self.assertEqual(
            settings.get_database_url(),
            "postgresql://postgres:secret@localhost:5432/appdb",
        )

    def test_get_database_url_raises_when_not_configured(self):
        settings = Settings(
            _env_file=None,
            DATABASE_URL=None,
            DB_USER=None,
            DB_PASSWORD=None,
            DB_HOST=None,
            DB_PORT=None,
            DB_NAME=None,
        )

        with self.assertRaisesRegex(ValueError, "Database configuration missing"):
            settings.get_database_url()

    def test_get_cors_origins_parses_csv(self):
        settings = Settings(
            _env_file=None,
            CORS_ALLOW_ORIGINS="https://one.example, https://two.example",
        )

        self.assertEqual(
            settings.get_cors_origins(),
            ["https://one.example", "https://two.example"],
        )

    def test_clerk_issuer_alias_maps_to_clerk_jwt_issuer(self):
        with patch.dict(
            os.environ,
            {
                "CLERK_ISSUER": "https://issuer.example.clerk.accounts.dev",
            },
            clear=True,
        ):
            settings = Settings(_env_file=None)

        self.assertEqual(
            settings.CLERK_JWT_ISSUER,
            "https://issuer.example.clerk.accounts.dev",
        )

    def test_stripe_enabled_requires_secret_and_default_price(self):
        settings = Settings(
            _env_file=None,
            STRIPE_SECRET_KEY="sk_test_123",
            STRIPE_WEBHOOK_SECRET="whsec_123",
            STRIPE_DEFAULT_PRICE_ID="price_123",
        )

        self.assertTrue(settings.is_stripe_enabled())

    def test_stripe_success_url_includes_checkout_placeholder(self):
        settings = Settings(
            _env_file=None,
            STRIPE_FRONTEND_URL="http://localhost:3000/",
        )

        self.assertEqual(
            settings.get_stripe_success_url(),
            "http://localhost:3000/?checkout=success&session_id={CHECKOUT_SESSION_ID}",
        )

    def test_invalid_stripe_payment_mode_raises(self):
        settings = Settings(_env_file=None, STRIPE_PAYMENT_MODE="setup")

        with self.assertRaisesRegex(ValueError, "STRIPE_PAYMENT_MODE"):
            settings.get_stripe_payment_mode()


if __name__ == "__main__":
    unittest.main()
