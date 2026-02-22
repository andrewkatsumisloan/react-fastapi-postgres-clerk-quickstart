from typing import Any, Dict, Optional
import logging

import httpx
import jwt
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.models import User

logger = logging.getLogger(__name__)
security = HTTPBearer()
_jwks_client: Optional[PyJWKClient] = None


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client

    if not settings.CLERK_JWT_ISSUER:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication is not configured",
        )

    if _jwks_client is None:
        _jwks_client = PyJWKClient(
            f"{settings.CLERK_JWT_ISSUER}/.well-known/jwks.json"
        )

    return _jwks_client


def validate_jwt(token: str) -> Dict[str, Any]:
    jwks_client = _get_jwks_client()

    try:
        signing_key = jwks_client.get_signing_key_from_jwt(token).key
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token key ID",
            headers={"WWW-Authenticate": "Bearer"},
        )

    decode_kwargs: Dict[str, Any] = {
        "key": signing_key,
        "algorithms": ["RS256"],
        "issuer": settings.CLERK_JWT_ISSUER,
    }
    if settings.CLERK_AUDIENCE:
        decode_kwargs["audience"] = settings.CLERK_AUDIENCE
    else:
        decode_kwargs["options"] = {"verify_aud": False}

    try:
        return jwt.decode(token, **decode_kwargs)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidIssuerError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token issuer",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidAudienceError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token audience",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate token",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def _fetch_clerk_user(user_id: str, clerk_api_key: str) -> Dict[str, Any]:
    headers = {"Authorization": f"Bearer {clerk_api_key}"}
    url = f"https://api.clerk.dev/v1/users/{user_id}"

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(url, headers=headers)

    if response.status_code != status.HTTP_200_OK:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to get user data from Clerk (status={response.status_code})",
        )

    return response.json()


def _extract_user_identity(clerk_user_data: Dict[str, Any]) -> tuple[str, str]:
    primary_email_obj = next(
        (
            email
            for email in clerk_user_data.get("email_addresses", [])
            if email.get("id") == clerk_user_data.get("primary_email_address_id")
        ),
        None,
    )
    email = primary_email_obj.get("email_address") if primary_email_obj else None

    first_name = clerk_user_data.get("first_name")
    last_name = clerk_user_data.get("last_name")
    if first_name and last_name:
        name = f"{first_name} {last_name}"
    elif first_name:
        name = first_name
    elif last_name:
        name = last_name
    else:
        name = clerk_user_data.get("username")

    if not email or not name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to create user: missing required user information from Clerk.",
        )

    return email, name


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    payload = validate_jwt(credentials.credentials)

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter_by(clerk_user_id=user_id).first()
    if user:
        return user

    if not settings.CLERK_SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Clerk API key not configured",
        )

    try:
        clerk_user_data = await _fetch_clerk_user(user_id, settings.CLERK_SECRET_KEY)
        email, name = _extract_user_identity(clerk_user_data)

        user = User(clerk_user_id=user_id, email=email, name=name)
        db.add(user)
        db.commit()
        db.refresh(user)
        logger.info("Provisioned user for clerk_user_id=%s", user_id)
        return user
    except HTTPException:
        raise
    except IntegrityError:
        db.rollback()
        user = db.query(User).filter_by(clerk_user_id=user_id).first()
        if user:
            return user
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User record conflict while provisioning",
        )
    except httpx.HTTPError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to reach authentication provider",
        )
    except Exception:
        db.rollback()
        logger.exception("Unexpected error while provisioning user")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching user data from Clerk",
        )


async def optional_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> Optional[User]:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None

    token = authorization.split(" ", 1)[1]
    try:
        payload = validate_jwt(token)
        user_id = payload.get("sub")
        if not user_id:
            return None
        return db.query(User).filter_by(clerk_user_id=user_id).first()
    except HTTPException:
        return None
