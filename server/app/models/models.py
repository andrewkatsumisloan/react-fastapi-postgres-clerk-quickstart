from sqlalchemy import Column, Integer, String, UniqueConstraint
from app.db.base_class import Base


class User(Base):
    """User model for authentication and profile data"""

    # Explicitly set table name to avoid PostgreSQL reserved keyword
    __tablename__ = "app_users"

    id = Column(Integer, primary_key=True, index=True)
    clerk_user_id = Column(String, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=True)

    __table_args__ = (UniqueConstraint("clerk_user_id", name="uq_clerk_user_id"),)

    def __str__(self):
        return f"{self.name or self.email}"
