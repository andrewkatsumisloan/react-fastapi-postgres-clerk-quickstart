import asyncio
import os
import unittest
from unittest.mock import patch

from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

os.environ.setdefault("DATABASE_URL", "sqlite:///./test_auth.db")
os.environ.setdefault("CLERK_JWT_ISSUER", "https://issuer.example.clerk.accounts.dev")

import app.core.auth as auth


class QueryStub:
    def filter_by(self, **_kwargs):
        return self

    def first(self):
        return None


class DBStub:
    def __init__(self):
        self.added_user = None
        self.did_commit = False

    def query(self, _model):
        return QueryStub()

    def add(self, user):
        self.added_user = user

    def commit(self):
        self.did_commit = True

    def refresh(self, _user):
        pass


class FakeResponse:
    status_code = 404

    def json(self):
        return {}


class FakeAsyncClient:
    async def __aenter__(self):
        return self

    async def __aexit__(self, _exc_type, _exc, _tb):
        return False

    async def get(self, *_args, **_kwargs):
        return FakeResponse()


class AuthTests(unittest.TestCase):
    def test_get_current_user_preserves_http_exception_status(self):
        creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials="token")

        with patch.object(auth, "validate_jwt", return_value={"sub": "user_123"}):
            with patch.object(auth.settings, "CLERK_SECRET_KEY", "sk_test"):
                with patch("app.core.auth.httpx.AsyncClient", return_value=FakeAsyncClient()):
                    with self.assertRaises(HTTPException) as ctx:
                        asyncio.run(auth.get_current_user(credentials=creds, db=DBStub()))

        self.assertEqual(ctx.exception.status_code, 400)

    def test_get_current_user_provisions_from_jwt_claims_without_clerk_secret(self):
        creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials="token")
        db = DBStub()

        with patch.object(
            auth,
            "validate_jwt",
            return_value={
                "sub": "user_123",
                "email": "user@example.com",
                "given_name": "Launch",
                "family_name": "User",
            },
        ):
            with patch.object(auth.settings, "CLERK_SECRET_KEY", None):
                user = asyncio.run(auth.get_current_user(credentials=creds, db=db))

        self.assertEqual(user.clerk_user_id, "user_123")
        self.assertEqual(user.email, "user@example.com")
        self.assertEqual(user.name, "Launch User")
        self.assertTrue(db.did_commit)

    def test_extract_user_identity_allows_missing_name(self):
        email, name = auth._extract_user_identity(
            {
                "primary_email_address_id": "email_123",
                "email_addresses": [
                    {
                        "id": "email_123",
                        "email_address": "user@example.com",
                    }
                ],
            }
        )

        self.assertEqual(email, "user@example.com")
        self.assertIsNone(name)


if __name__ == "__main__":
    unittest.main()
