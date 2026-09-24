from fastapi import APIRouter

from app.api import auth, tenants, chargers, sessions, vehicles, invoices, allocator, websocket

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(tenants.router, prefix="/tenants", tags=["tenants"])
api_router.include_router(chargers.router, prefix="/chargers", tags=["chargers"])
api_router.include_router(sessions.router, prefix="/sessions", tags=["sessions"])
api_router.include_router(vehicles.router, prefix="/vehicles", tags=["vehicles"])
api_router.include_router(invoices.router, prefix="/invoices", tags=["invoices"])
api_router.include_router(allocator.router, prefix="/allocator", tags=["allocator"])
api_router.include_router(websocket.router, prefix="/ws", tags=["websocket"])