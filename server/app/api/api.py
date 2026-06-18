from fastapi import APIRouter

from app.api.routes.payments import router as payments_router
from app.api.routes.user import router as user_router

api_router = APIRouter()

# Include all routes here
api_router.include_router(user_router, prefix="/users", tags=["users"])
api_router.include_router(payments_router, prefix="/payments", tags=["payments"])

# Add more routers as needed
