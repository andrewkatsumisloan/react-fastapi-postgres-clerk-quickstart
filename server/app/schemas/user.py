from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    """Base user schema with shared properties"""

    email: EmailStr
    name: Optional[str] = None


class UserCreate(UserBase):
    """Schema for creating a user"""

    clerk_user_id: str


class UserUpdate(BaseModel):
    """Schema for updating a user"""

    name: Optional[str] = None


class User(BaseModel):
    """Schema for user responses"""

    id: int
    clerk_user_id: str
    email: EmailStr
    name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
