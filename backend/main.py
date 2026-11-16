"""FastAPI Application Entrypoint for Banking AI Anomaly Detection & Risk Monitoring.
"""

from contextlib import asynccontextmanager
from datetime import datetime, timezone
import logging
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlmodel import Session, select, func

from backend.database import init_db, engine
from backend.models import Customer, Transaction
from backend.routes import router
from data.seed_data import seed_database

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("bank_monitoring")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager: initialize SQLite DB and ensure seed data on startup."""
    logger.info("Initializing SQLite database tables...")
    init_db()

    # Check if database has records; auto-seed if empty
    with Session(engine) as session:
        cust_count = session.exec(select(func.count(Customer.client_id))).one()
        if cust_count == 0:
            logger.info("Database is empty. Seeding initial banking dataset...")
            seed_database(force=False)
        else:
            logger.info(f"Database ready with {cust_count} active customers.")

    yield
    logger.info("Shutting down banking monitoring API.")


app = FastAPI(
    title="Banking AI Anomaly Detection & Risk Monitoring API",
    description="Intelligent transaction monitoring, behavioural risk scoring, and case investigations.",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for React frontend (Vite default port 5173 and alternate ports)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes under /api/v1
app.include_router(router)


@app.get("/health")
def health_check():
    """Health check endpoint to verify backend status, DB, and AI toolchain."""
    db_healthy = False
    customer_count = 0
    try:
        with Session(engine) as session:
            customer_count = session.exec(select(func.count(Customer.client_id))).one()
            db_healthy = True
    except Exception as e:
        logger.error(f"Health check DB error: {e}")

    return {
        "status": "HEALTHY" if db_healthy else "DEGRADED",
        "service": "Banking AI Anomaly Detection & Risk Monitoring",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": {
            "type": "SQLite",
            "connected": db_healthy,
            "customers": customer_count
        },
        "ai_engine": {
            "timesfm_support": True,
            "isolation_forest_support": True,
            "risk_grades": ["NORMAL", "LOW", "HIGH", "CRITICAL"]
        }
    }


# Mount built React frontend if dist exists
dist_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist")
if os.path.exists(dist_path):
    logger.info(f"Serving built React frontend from: {dist_path}")
    app.mount("/assets", StaticFiles(directory=os.path.join(dist_path, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Don't intercept API or docs routes
        if full_path.startswith("api/") or full_path.startswith("docs") or full_path.startswith("openapi.json"):
            return None
        index_file = os.path.join(dist_path, "index.html")
        return FileResponse(index_file)
else:
    @app.get("/")
    def root():
        return {
            "message": "Banking AI Anomaly Detection & Risk Monitoring API is running.",
            "docs_url": "/docs",
            "health_check": "/health"
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
