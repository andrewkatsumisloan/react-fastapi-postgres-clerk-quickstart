from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
import logging

from app.db.session import get_db
from app.core.auth import get_current_user
from app.models.models import User
from app.schemas.user import User as UserSchema, UserUpdate

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/me", response_model=UserSchema)
async def read_users_me(current_user: User = Depends(get_current_user)):
    """
    Get current authenticated user
    """
    # Log the current user data
    logger.info("Fetched profile for user_id=%s", current_user.id)

    # Ensure email is valid before returning
    if not current_user.email or "@" not in current_user.email:
        logger.warning(f"Invalid email found in user record: '{current_user.email}'")
        # This is just for logging - the schema validator will handle this

    return current_user


@router.put("/me", response_model=UserSchema)
async def update_user(
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update current user
    """
    # Update fields that are provided
    for field, value in user_data.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value)

    try:
        db.commit()
        db.refresh(current_user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Update conflicts with an existing user record",
        )

    return current_user
