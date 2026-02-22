import asyncio
import os
import unittest

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError

os.environ.setdefault("DATABASE_URL", "sqlite:///./test_user_route.db")
os.environ.setdefault("CLERK_JWT_ISSUER", "https://issuer.example.clerk.accounts.dev")

from app.api.routes.user import update_user
from app.schemas.user import UserUpdate


class DummyUser:
    def __init__(self):
        self.id = 1
        self.email = "initial@example.com"
        self.name = "Initial"


class FailingDB:
    def __init__(self):
        self.did_rollback = False

    def commit(self):
        raise IntegrityError("UPDATE users", {}, Exception("duplicate"))

    def rollback(self):
        self.did_rollback = True

    def refresh(self, _obj):
        pass


class UserRouteTests(unittest.TestCase):
    def test_update_user_returns_conflict_on_integrity_error(self):
        db = FailingDB()
        user = DummyUser()

        with self.assertRaises(HTTPException) as ctx:
            asyncio.run(
                update_user(
                    user_data=UserUpdate(email="duplicate@example.com"),
                    current_user=user,
                    db=db,
                )
            )

        self.assertEqual(ctx.exception.status_code, 409)
        self.assertTrue(db.did_rollback)


if __name__ == "__main__":
    unittest.main()
