from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List

from app.db.session import get_db, get_next_id
from app.schemas import ChargerCreate, ChargerUpdate, ChargerResponse
from app.api.auth import get_current_tenant_id

router = APIRouter()


@router.post("", response_model=ChargerResponse, status_code=status.HTTP_201_CREATED)
async def create_charger(
    charger_in: ChargerCreate,
    db=Depends(get_db),
    tenant_id: int = Depends(get_current_tenant_id),
):
    if charger_in.tenant_id != tenant_id:
        raise HTTPException(
            status_code=403,
            detail="Cannot create charger for another tenant"
        )

    tenant = await db["tenants"].find_one(
        {"tenant_id": tenant_id, "site_id": charger_in.site_id}
    )
    if not tenant:
        raise HTTPException(
            status_code=400,
            detail="site_id does not belong to the authenticated tenant"
        )

    now = datetime.utcnow()
    charger = {
        "charger_id": await get_next_id("chargers"),
        "site_id": charger_in.site_id,
        "tenant_id": tenant_id,
        "max_power_kw": charger_in.max_power_kw,
        "status": "available",
        "created_at": now,
        "updated_at": now,
    }
    await db["chargers"].insert_one(charger)
    return charger


@router.get("", response_model=List[ChargerResponse])
async def list_chargers(
    db=Depends(get_db),
    tenant_id: int = Depends(get_current_tenant_id),
):
    cursor = db["chargers"].find({"tenant_id": tenant_id}).sort("charger_id", 1)
    return await cursor.to_list(length=None)


@router.get("/{charger_id}", response_model=ChargerResponse)
async def get_charger(
    charger_id: int,
    db=Depends(get_db),
    tenant_id: int = Depends(get_current_tenant_id),
):
    charger = await db["chargers"].find_one(
        {"charger_id": charger_id, "tenant_id": tenant_id}
    )
    if not charger:
        raise HTTPException(status_code=404, detail="Charger not found")
    return charger


@router.patch("/{charger_id}", response_model=ChargerResponse)
async def update_charger(
    charger_id: int,
    charger_in: ChargerUpdate,
    db=Depends(get_db),
    tenant_id: int = Depends(get_current_tenant_id),
):
    charger = await db["chargers"].find_one(
        {"charger_id": charger_id, "tenant_id": tenant_id}
    )
    if not charger:
        raise HTTPException(status_code=404, detail="Charger not found")

    updates = {
        k: v if not hasattr(v, "value") else v.value
        for k, v in charger_in.model_dump(exclude_unset=True).items()
    }
    updates["updated_at"] = datetime.utcnow()
    await db["chargers"].update_one({"_id": charger["_id"]}, {"$set": updates})
    updated = await db["chargers"].find_one({"_id": charger["_id"]})
    return updated


@router.post("/{charger_id}/start-session", response_model=ChargerResponse)
async def start_charging_session(
    charger_id: int,
    vehicle_id: int,
    db=Depends(get_db),
    tenant_id: int = Depends(get_current_tenant_id),
):
    """Start a charging session for a vehicle on this charger."""
    charger = await db["chargers"].find_one(
        {"charger_id": charger_id, "tenant_id": tenant_id}
    )
    if not charger:
        raise HTTPException(status_code=404, detail="Charger not found")

    if charger["status"] != "available":
        raise HTTPException(status_code=400, detail="Charger not available")

    vehicle = await db["vehicles"].find_one(
        {"vehicle_id": vehicle_id, "tenant_id": tenant_id}
    )
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    now = datetime.utcnow()
    session = {
        "session_id": await get_next_id("sessions"),
        "charger_id": charger_id,
        "vehicle_id": vehicle_id,
        "tenant_id": tenant_id,
        "start_time": now,
        "end_time": None,
        "kwh": 0.0,
        "allocated_power_kw": 0,
        "peak_allocated_power_kw": 0,
        "status": "active",
        "created_at": now,
        "updated_at": now,
    }
    await db["sessions"].insert_one(session)

    await db["chargers"].update_one(
        {"_id": charger["_id"]},
        {"$set": {"status": "charging", "updated_at": now}},
    )
    updated = await db["chargers"].find_one({"_id": charger["_id"]})
    return updated


@router.post("/{charger_id}/stop-session", response_model=ChargerResponse)
async def stop_charging_session(
    charger_id: int,
    db=Depends(get_db),
    tenant_id: int = Depends(get_current_tenant_id),
):
    """Stop the active charging session on this charger."""
    charger = await db["chargers"].find_one(
        {"charger_id": charger_id, "tenant_id": tenant_id}
    )
    if not charger:
        raise HTTPException(status_code=404, detail="Charger not found")

    session = await db["sessions"].find_one(
        {"charger_id": charger_id, "tenant_id": tenant_id, "status": "active"}
    )
    if session:
        now = datetime.utcnow()
        await db["sessions"].update_one(
            {"_id": session["_id"]},
            {"$set": {"status": "completed", "end_time": now, "updated_at": now}},
        )

    now = datetime.utcnow()
    await db["chargers"].update_one(
        {"_id": charger["_id"]},
        {"$set": {"status": "available", "updated_at": now}},
    )
    updated = await db["chargers"].find_one({"_id": charger["_id"]})
    return updated