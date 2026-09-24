from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from typing import Dict, Set
import asyncio
from datetime import datetime

from app.db.session import db as mongo_db
from app.models import SessionStatus
from app.core.config import get_settings
from app.core.security import verify_token

router = APIRouter()
settings = get_settings()

# Connection manager per tenant
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, tenant_id: int):
        await websocket.accept()
        if tenant_id not in self.active_connections:
            self.active_connections[tenant_id] = set()
        self.active_connections[tenant_id].add(websocket)

    def disconnect(self, websocket: WebSocket, tenant_id: int):
        if tenant_id in self.active_connections:
            self.active_connections[tenant_id].discard(websocket)
            if not self.active_connections[tenant_id]:
                del self.active_connections[tenant_id]

    async def broadcast_to_tenant(self, tenant_id: int, message: dict):
        if tenant_id in self.active_connections:
            disconnected = set()
            for connection in self.active_connections[tenant_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    disconnected.add(connection)
            for conn in disconnected:
                self.disconnect(conn, tenant_id)

    async def broadcast_all(self, message: dict):
        for tenant_id in list(self.active_connections.keys()):
            await self.broadcast_to_tenant(tenant_id, message)


manager = ConnectionManager()


@router.websocket("/live/{tenant_id}")
async def websocket_endpoint(websocket: WebSocket, tenant_id: int, token: str = Query(...)):
    """WebSocket endpoint for real-time charger/session updates per tenant."""
    # Verify token
    payload = verify_token(token)
    if not payload or payload.get("tenant_id") != tenant_id:
        await websocket.close(code=4001, reason="Invalid token")
        return

    await manager.connect(websocket, tenant_id)

    # Send initial state
    await send_initial_state(websocket, tenant_id)

    try:
        while True:
            # Keep connection alive with heartbeat
            await asyncio.sleep(settings.ws_heartbeat_interval)
            await websocket.send_json({"type": "heartbeat", "timestamp": datetime.utcnow().isoformat()})
    except WebSocketDisconnect:
        manager.disconnect(websocket, tenant_id)
    except Exception:
        manager.disconnect(websocket, tenant_id)


async def send_initial_state(websocket: WebSocket, tenant_id: int):
    """Send initial state of all chargers and sessions for tenant."""
    chargers = await mongo_db["chargers"].find(
        {"tenant_id": tenant_id}
    ).sort("charger_id", 1).to_list(length=None)

    active_sessions = await mongo_db["sessions"].find(
        {"tenant_id": tenant_id, "status": SessionStatus.ACTIVE.value}
    ).sort("start_time", -1).to_list(length=None)

    vehicle_ids = [s["vehicle_id"] for s in active_sessions]
    vehicles = await mongo_db["vehicles"].find(
        {"vehicle_id": {"$in": vehicle_ids}, "tenant_id": tenant_id}
    ).to_list(length=None)
    vehicle_map = {v["vehicle_id"]: v for v in vehicles}

    charger_data = [
        {
            "charger_id": c["charger_id"],
            "status": c["status"],
            "max_power_kw": c["max_power_kw"],
        }
        for c in chargers
    ]

    session_data = []
    for s in active_sessions:
        vehicle = vehicle_map.get(s["vehicle_id"])
        if not vehicle:
            continue
        session_data.append({
            "session_id": s["session_id"],
            "charger_id": s["charger_id"],
            "vehicle_id": vehicle["vehicle_id"],
            "driver": vehicle["driver"],
            "priority_tier": vehicle.get("priority_tier") or "low",
            "allocated_power_kw": s.get("allocated_power_kw") or 0,
            "peak_allocated_power_kw": s.get("peak_allocated_power_kw") or 0,
            "kwh": float(s.get("kwh") or 0),
        })

    await websocket.send_json({
        "type": "initial_state",
        "chargers": charger_data,
        "sessions": session_data,
        "timestamp": datetime.utcnow().isoformat(),
    })


async def broadcast_allocation_update(tenant_id: int, allocations: list):
    """Broadcast allocation update to all connected clients for a tenant."""
    message = {
        "type": "allocation_update",
        "allocations": allocations,
        "timestamp": datetime.utcnow().isoformat(),
    }
    await manager.broadcast_to_tenant(tenant_id, message)


async def broadcast_session_event(tenant_id: int, event_type: str, session_data: dict):
    """Broadcast session start/stop events."""
    message = {
        "type": event_type,
        "session": session_data,
        "timestamp": datetime.utcnow().isoformat(),
    }
    await manager.broadcast_to_tenant(tenant_id, message)


async def broadcast_charger_status(tenant_id: int, charger_id: int, status: str):
    """Broadcast charger status change."""
    message = {
        "type": "charger_status",
        "charger_id": charger_id,
        "status": status,
        "timestamp": datetime.utcnow().isoformat(),
    }
    await manager.broadcast_to_tenant(tenant_id, message)