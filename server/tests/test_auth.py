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
    def query(self, _model):
        return QueryStub()


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


if __name__ == "__main__":
    unittest.main()
