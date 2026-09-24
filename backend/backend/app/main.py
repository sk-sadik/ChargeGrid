from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
from app.api import api_router
from app.db.session import init_db, db, close_mongo
from app.api.websocket import manager
from app.api.simulator import seed_demo_data, simulator_loop, run_allocator_for_all_tenants
from app.api.allocator import run_allocator
import asyncio

settings = get_settings()

# Background tasks
allocator_task = None
simulator_task = None

# MongoDB startup resilience
DB_STARTUP_MAX_RETRIES = 12
DB_STARTUP_RETRY_DELAY_SECONDS = 10


async def _init_db_with_retry() -> None:
    for attempt in range(1, DB_STARTUP_MAX_RETRIES + 1):
        try:
            await init_db()
            return
        except Exception as e:
            if attempt == DB_STARTUP_MAX_RETRIES:
                raise
            print(f"[Startup] MongoDB init attempt {attempt} failed: {e} - retrying...")
            await asyncio.sleep(DB_STARTUP_RETRY_DELAY_SECONDS)


async def allocator_loop():
    """Run allocator every 60 seconds for all tenants."""
    while True:
        try:
            await asyncio.sleep(settings.allocator_interval_seconds)
            tenants = await db["tenants"].find().to_list(length=None)
            for tenant in tenants:
                try:
                    await run_allocator(tenant["tenant_id"])
                except Exception as e:
                    print(f"Allocator error for tenant {tenant['tenant_id']}: {e}")
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"Allocator loop error: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await _init_db_with_retry()

    # Security check: refuse to boot in non-development with default secret
    if settings.app_env != "development" and settings.secret_key == "your-secret-key-change-in-production-min-32-chars":
        raise RuntimeError(
            "SECURITY ERROR: SECRET_KEY is still the default placeholder. "
            "Set a strong secret key via SECRET_KEY environment variable before running in production."
        )

    # Seed demo data (development only) - creates demo tenants, chargers, vehicles,
    # sessions and demo users. Skipped in production: seeding deletes existing rows
    # on every restart, which would destroy real data.
    if settings.app_env != "production":
        await seed_demo_data()
        # Run allocator once to set initial allocations
        await run_allocator_for_all_tenants()

    global allocator_task, simulator_task
    allocator_task = asyncio.create_task(allocator_loop())
    simulator_task = asyncio.create_task(simulator_loop())

    yield

    # Shutdown
    for task in (allocator_task, simulator_task):
        if task:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
    await close_mongo()


app = FastAPI(
    title=settings.app_name,
    description="Charge Grid - a grid-aware multi-tenant EV charging optimizer",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS configuration - explicit origins from settings (no "*" with credentials)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "allocator_running": allocator_task is not None and not allocator_task.done(),
        "simulator_running": simulator_task is not None and not simulator_task.done(),
        "ws_connections": sum(len(conns) for conns in manager.active_connections.values()),
    }


@app.get("/")
async def root():
    return {
        "name": settings.app_name,
        "version": "0.1.0",
        "docs": "/docs",
        "health": "/health",
    }