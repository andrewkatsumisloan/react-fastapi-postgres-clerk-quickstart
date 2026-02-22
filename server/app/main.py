from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from app.api.api import api_router
from app.core.config import settings

# Import models to ensure they are registered with SQLAlchemy
from app.models import models

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)


app = FastAPI(title="Fullstack Template API")


# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
async def root():
    """Root endpoint returning API info"""
    return {"message": "Welcome to the Fullstack Template API", "docs_url": "/docs"}


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


@app.get("/api/info")
async def get_info():
    """Information about the backend stack"""
    return {
        "name": "Fullstack Template Backend",
        "version": "1.0.0",
        "stack": {
            "framework": "FastAPI",
            "database": "SQLAlchemy",
            "deployment": "Docker",
        },
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
