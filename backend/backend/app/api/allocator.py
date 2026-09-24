from fastapi import APIRouter, Depends, HTTPException
from typing import List
from pydantic import BaseModel
from datetime import datetime

from app.db.session import db as mongo_db
from app.models import SessionStatus
from app.api.auth import get_current_tenant_id

router = APIRouter()

# Priority weights for greedy allocator
PRIORITY_WEIGHTS = {
    "high": 3,
    "medium": 2,
    "low": 1,
}

DEFAULT_REQUEST_KW = 11  # min(charger.max_power_kw, 11) - static default request size


class AllocationResult(BaseModel):
    charger_id: int
    vehicle_id: int
    requested_kw: int
    allocated_kw: int
    priority_tier: str
    reason: str


class AllocatorResponse(BaseModel):
    site_power_cap_kw: int
    total_requested_kw: int
    total_allocated_kw: int
    allocations: List[AllocationResult]
    timestamp: datetime


async def get_active_sessions_with_details(tenant_id: int) -> List[dict]:
    """Fetch all active sessions with charger and vehicle details for a tenant."""
    sessions = await mongo_db["sessions"].find(
        {"tenant_id": tenant_id, "status": SessionStatus.ACTIVE.value}
    ).sort("start_time", 1).to_list(length=None)

    if not sessions:
        return []

    charger_ids = [s["charger_id"] for s in sessions]
    vehicle_ids = [s["vehicle_id"] for s in sessions]

    chargers = await mongo_db["chargers"].find(
        {"charger_id": {"$in": charger_ids}, "tenant_id": tenant_id}
    ).to_list(length=None)
    vehicles = await mongo_db["vehicles"].find(
        {"vehicle_id": {"$in": vehicle_ids}, "tenant_id": tenant_id}
    ).to_list(length=None)

    charger_map = {c["charger_id"]: c for c in chargers}
    vehicle_map = {v["vehicle_id"]: v for v in vehicles}

    details = []
    for session in sessions:
        charger = charger_map.get(session["charger_id"])
        vehicle = vehicle_map.get(session["vehicle_id"])
        if not charger or not vehicle:
            continue
        details.append({
            "session": session,
            "charger": charger,
            "vehicle": vehicle,
        })
    return details


async def run_allocator(tenant_id: int) -> AllocatorResponse:
    """Run the greedy priority-based power allocator for the given tenant."""
    tenant = await mongo_db["tenants"].find_one({"tenant_id": tenant_id})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    site_cap = tenant["site_power_cap_kw"]
    active_sessions = await get_active_sessions_with_details(tenant_id)

    if not active_sessions:
        return AllocatorResponse(
            site_power_cap_kw=site_cap,
            total_requested_kw=0,
            total_allocated_kw=0,
            allocations=[],
            timestamp=datetime.utcnow(),
        )

    # Build allocation requests with priority
    # NOTE: The allocator intentionally uses a static default request size
    # (min(charger.max_power_kw, 11)) rather than consuming the simulator's
    # live `requested_power_kw` telemetry. This keeps the allocation logic
    # simple and deterministic for the demo. The simulator's
    # `requested_power_kw` drift is broadcast via WebSocket for display only.
    requests = []
    for item in active_sessions:
        session = item["session"]
        charger = item["charger"]
        vehicle = item["vehicle"]
        priority_tier = vehicle.get("priority_tier") or "low"
        requested = min(charger["max_power_kw"], DEFAULT_REQUEST_KW)
        requests.append({
            "session": session,
            "charger": charger,
            "vehicle": vehicle,
            "requested_kw": requested,
            "priority_weight": PRIORITY_WEIGHTS.get(priority_tier, 1),
            "priority_tier": priority_tier,
        })

    # Sort by priority (highest first), then by start_time (earliest first)
    requests.sort(key=lambda x: (-x["priority_weight"], x["session"]["start_time"]))

    # Greedy allocation
    remaining_capacity = site_cap
    allocations = []
    now = datetime.utcnow()

    for req in requests:
        if remaining_capacity <= 0:
            allocated = 0
            reason = "site_limit_exhausted"
        else:
            allocated = min(req["requested_kw"], remaining_capacity)
            remaining_capacity -= allocated
            if allocated < req["requested_kw"]:
                reason = "site_limit_reached"
            else:
                reason = "fully_allocated"

        # Update session
        session = req["session"]
        peak = max(session.get("peak_allocated_power_kw") or 0, allocated)
        await mongo_db["sessions"].update_one(
            {"_id": session["_id"]},
            {
                "$set": {
                    "allocated_power_kw": allocated,
                    "peak_allocated_power_kw": peak,
                    "updated_at": now,
                }
            },
        )

        allocations.append(AllocationResult(
            charger_id=req["charger"]["charger_id"],
            vehicle_id=req["vehicle"]["vehicle_id"],
            requested_kw=req["requested_kw"],
            allocated_kw=allocated,
            priority_tier=req["priority_tier"],
            reason=reason,
        ))

    total_requested = sum(a.requested_kw for a in allocations)
    total_allocated = sum(a.allocated_kw for a in allocations)

    return AllocatorResponse(
        site_power_cap_kw=site_cap,
        total_requested_kw=total_requested,
        total_allocated_kw=total_allocated,
        allocations=allocations,
        timestamp=now,
    )


@router.post("/run", response_model=AllocatorResponse)
async def run_allocator_endpoint(tenant_id: int = Depends(get_current_tenant_id)):
    """Run the greedy priority-based power allocator for the current tenant."""
    return await run_allocator(tenant_id)


@router.get("/status", response_model=AllocatorResponse)
async def get_allocator_status(tenant_id: int = Depends(get_current_tenant_id)):
    """Get current allocation status without running allocator."""
    tenant = await mongo_db["tenants"].find_one({"tenant_id": tenant_id})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    active_sessions = await get_active_sessions_with_details(tenant_id)

    allocations = []
    for item in active_sessions:
        session = item["session"]
        charger = item["charger"]
        vehicle = item["vehicle"]
        allocations.append(AllocationResult(
            charger_id=charger["charger_id"],
            vehicle_id=vehicle["vehicle_id"],
            requested_kw=min(charger["max_power_kw"], DEFAULT_REQUEST_KW),
            allocated_kw=session.get("allocated_power_kw") or 0,
            priority_tier=vehicle.get("priority_tier") or "low",
            reason="current_allocation",
        ))

    total_requested = sum(a.requested_kw for a in allocations)
    total_allocated = sum(a.allocated_kw for a in allocations)

    return AllocatorResponse(
        site_power_cap_kw=tenant["site_power_cap_kw"],
        total_requested_kw=total_requested,
        total_allocated_kw=total_allocated,
        allocations=allocations,
        timestamp=datetime.utcnow(),
    )