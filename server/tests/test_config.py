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


if __name__ == "__main__":
    unittest.main()
