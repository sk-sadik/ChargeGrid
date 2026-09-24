from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime
from typing import List, Optional

from app.db.session import get_db, get_next_id
from app.schemas import SessionCreate, SessionUpdate, SessionResponse
from app.api.auth import get_current_tenant_id

router = APIRouter()


@router.post("", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(session_in: SessionCreate, db=Depends(get_db), tenant_id: int = Depends(get_current_tenant_id)):
    if session_in.tenant_id != tenant_id:
        raise HTTPException(status_code=403, detail="Cannot create session for another tenant")

    charger = await db["chargers"].find_one(
        {"charger_id": session_in.charger_id, "tenant_id": tenant_id}
    )
    if not charger:
        raise HTTPException(status_code=404, detail="Charger not found")
    if charger["status"] != "available":
        raise HTTPException(status_code=400, detail="Charger not available")

    vehicle = await db["vehicles"].find_one(
        {"vehicle_id": session_in.vehicle_id, "tenant_id": tenant_id}
    )
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    now = datetime.utcnow()
    session = {
        "session_id": await get_next_id("sessions"),
        "charger_id": session_in.charger_id,
        "vehicle_id": session_in.vehicle_id,
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
    return session


@router.get("", response_model=List[SessionResponse])
async def list_sessions(
    session_status: Optional[str] = None,
    charger_id: Optional[int] = None,
    vehicle_id: Optional[int] = None,
    db=Depends(get_db),
    tenant_id: int = Depends(get_current_tenant_id),
):
    query: dict = {"tenant_id": tenant_id}
    if session_status:
        query["status"] = session_status
    if charger_id:
        query["charger_id"] = charger_id
    if vehicle_id:
        query["vehicle_id"] = vehicle_id
    cursor = db["sessions"].find(query).sort("start_time", -1)
    return await cursor.to_list(length=None)


@router.get("/active", response_model=List[SessionResponse])
async def list_active_sessions(db=Depends(get_db), tenant_id: int = Depends(get_current_tenant_id)):
    cursor = db["sessions"].find(
        {"tenant_id": tenant_id, "status": "active"}
    ).sort("start_time", -1)
    return await cursor.to_list(length=None)


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(session_id: int, db=Depends(get_db), tenant_id: int = Depends(get_current_tenant_id)):
    session = await db["sessions"].find_one(
        {"session_id": session_id, "tenant_id": tenant_id}
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.patch("/{session_id}", response_model=SessionResponse)
async def update_session(session_id: int, session_in: SessionUpdate, db=Depends(get_db), tenant_id: int = Depends(get_current_tenant_id)):
    session = await db["sessions"].find_one(
        {"session_id": session_id, "tenant_id": tenant_id}
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    updates = {
        k: v if not hasattr(v, "value") else v.value
        for k, v in session_in.model_dump(exclude_unset=True).items()
    }
    updates["updated_at"] = datetime.utcnow()
    await db["sessions"].update_one({"_id": session["_id"]}, {"$set": updates})
    updated = await db["sessions"].find_one({"_id": session["_id"]})
    return updated


@router.post("/{session_id}/complete", response_model=SessionResponse)
async def complete_session(session_id: int, final_kwh: float, db=Depends(get_db), tenant_id: int = Depends(get_current_tenant_id)):
    """Complete a session and generate invoice data."""
    session = await db["sessions"].find_one(
        {"session_id": session_id, "tenant_id": tenant_id}
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    now = datetime.utcnow()
    await db["sessions"].update_one(
        {"_id": session["_id"]},
        {"$set": {"status": "completed", "end_time": now, "kwh": final_kwh, "updated_at": now}},
    )

    # Free the charger
    await db["chargers"].update_one(
        {"charger_id": session["charger_id"], "tenant_id": tenant_id},
        {"$set": {"status": "available", "updated_at": now}},
    )

    updated = await db["sessions"].find_one({"_id": session["_id"]})
    return updated