from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime
from typing import List

from app.db.session import get_db, get_next_id
from app.schemas import VehicleCreate, VehicleUpdate, VehicleResponse
from app.api.auth import get_current_tenant_id

router = APIRouter()


@router.post("", response_model=VehicleResponse, status_code=status.HTTP_201_CREATED)
async def create_vehicle(vehicle_in: VehicleCreate, db=Depends(get_db), tenant_id: int = Depends(get_current_tenant_id)):
    if vehicle_in.tenant_id != tenant_id:
        raise HTTPException(status_code=403, detail="Cannot create vehicle for another tenant")

    now = datetime.utcnow()
    vehicle = {
        "vehicle_id": await get_next_id("vehicles"),
        "tenant_id": tenant_id,
        "battery_capacity": vehicle_in.battery_capacity,
        "driver": vehicle_in.driver,
        "priority_tier": vehicle_in.priority_tier.value,
        "created_at": now,
        "updated_at": now,
    }
    await db["vehicles"].insert_one(vehicle)
    return vehicle


@router.get("", response_model=List[VehicleResponse])
async def list_vehicles(db=Depends(get_db), tenant_id: int = Depends(get_current_tenant_id)):
    cursor = db["vehicles"].find({"tenant_id": tenant_id}).sort("vehicle_id", 1)
    return await cursor.to_list(length=None)


@router.get("/{vehicle_id}", response_model=VehicleResponse)
async def get_vehicle(vehicle_id: int, db=Depends(get_db), tenant_id: int = Depends(get_current_tenant_id)):
    vehicle = await db["vehicles"].find_one(
        {"vehicle_id": vehicle_id, "tenant_id": tenant_id}
    )
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return vehicle


@router.patch("/{vehicle_id}", response_model=VehicleResponse)
async def update_vehicle(vehicle_id: int, vehicle_in: VehicleUpdate, db=Depends(get_db), tenant_id: int = Depends(get_current_tenant_id)):
    """Update vehicle - including priority_tier (tenant_admin only)."""
    vehicle = await db["vehicles"].find_one(
        {"vehicle_id": vehicle_id, "tenant_id": tenant_id}
    )
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    updates = {
        k: v if not hasattr(v, "value") else v.value
        for k, v in vehicle_in.model_dump(exclude_unset=True).items()
    }
    updates["updated_at"] = datetime.utcnow()
    await db["vehicles"].update_one({"_id": vehicle["_id"]}, {"$set": updates})
    updated = await db["vehicles"].find_one({"_id": vehicle["_id"]})
    return updated