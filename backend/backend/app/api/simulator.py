"""
Charger Telemetry Simulator

Deterministic background task that simulates realistic EV charging telemetry:
- Seeds 2 tenants, 12 chargers (6 each), vehicles with mixed priorities, 8 concurrent sessions
- Every 2s: updates requested_power_kw with random drift (3-7 kW), increments kWh, broadcasts via WebSocket
- Uses random.seed(42) for reproducible demo behavior
- Scripts one session to disconnect mid-run
"""

import asyncio
import random
from datetime import datetime, timedelta
from typing import Dict, List, Optional

from app.db.session import db as mongo_db, get_next_id
from app.models import (
    ChargerStatus, PriorityTier,
    SessionStatus, UserRole
)
from app.core.security import get_password_hash
from app.api.websocket import manager, broadcast_session_event, broadcast_charger_status

# Deterministic seed for reproducible demo
random.seed(42)

# Track which session is scripted to disconnect (set during seed)
SCRIPTED_DISCONNECT_SESSION_ID: Optional[int] = None
DISCONNECT_AFTER_TICKS = 15  # Disconnect after ~30 seconds (15 ticks * 2s)


async def seed_demo_data() -> Dict[str, List[int]]:
    """
    Seed database with demo data:
    - 2 tenants (site-a, site-b)
    - 12 chargers (6 per tenant)
    - Vehicles with mixed priorities (High/Medium/Low)
    - 8 concurrent active sessions across both tenants

    Returns dict with tenant_ids, charger_ids, vehicle_ids, session_ids for reference.
    """
    # Clear existing demo data (idempotent) - children before parents
    await mongo_db["sessions"].delete_many({})
    await mongo_db["vehicles"].delete_many({})
    await mongo_db["chargers"].delete_many({})
    await mongo_db["invoices"].delete_many({})
    await mongo_db["users"].delete_many({})
    await mongo_db["tenants"].delete_many({})
    # Reset auto-increment counters so the demo always starts from id 1
    await mongo_db["counters"].delete_many({})

    now = datetime.utcnow()

    # Create 2 tenants
    tenant_a_id = await get_next_id("tenants")
    tenant_b_id = await get_next_id("tenants")
    tenant_a = {
        "tenant_id": tenant_a_id,
        "name": "Site A Fleet Depot",
        "site_id": "site-a",
        "billing_plan": "standard",
        "site_power_cap_kw": 50,
        "created_at": now,
        "updated_at": now,
    }
    tenant_b = {
        "tenant_id": tenant_b_id,
        "name": "Site B Commercial Plaza",
        "site_id": "site-b",
        "billing_plan": "standard",
        "site_power_cap_kw": 50,
        "created_at": now,
        "updated_at": now,
    }
    await mongo_db["tenants"].insert_many([tenant_a, tenant_b])

    tenants = [tenant_a, tenant_b]
    tenant_ids = [t["tenant_id"] for t in tenants]

    # Create demo users for each tenant (tenant_manager role, password: demo123)
    demo_password_hash = get_password_hash("demo123")
    user_a_id = await get_next_id("users")
    user_b_id = await get_next_id("users")
    user_a = {
        "user_id": user_a_id,
        "username": "site-a",
        "password_hash": demo_password_hash,
        "tenant_id": tenant_a_id,
        "role": UserRole.TENANT_MANAGER.value,
        "created_at": now,
        "updated_at": now,
    }
    user_b = {
        "user_id": user_b_id,
        "username": "site-b",
        "password_hash": demo_password_hash,
        "tenant_id": tenant_b_id,
        "role": UserRole.TENANT_MANAGER.value,
        "created_at": now,
        "updated_at": now,
    }
    await mongo_db["users"].insert_many([user_a, user_b])

    # Create 6 chargers per tenant (12 total)
    all_chargers = []
    for tenant in tenants:
        for i in range(6):
            charger_id = await get_next_id("chargers")
            charger = {
                "charger_id": charger_id,
                "site_id": tenant["site_id"],
                "tenant_id": tenant["tenant_id"],
                "max_power_kw": 11,
                "status": ChargerStatus.AVAILABLE.value,
                "created_at": now,
                "updated_at": now,
            }
            all_chargers.append(charger)
    await mongo_db["chargers"].insert_many(all_chargers)

    charger_ids = [c["charger_id"] for c in all_chargers]

    # Create vehicles with mixed priorities per tenant
    # 4 vehicles per tenant = 8 vehicles total
    # Priority mix: 2 High, 1 Medium, 1 Low per tenant
    priorities_per_tenant = [
        PriorityTier.HIGH.value, PriorityTier.HIGH.value,
        PriorityTier.MEDIUM.value, PriorityTier.LOW.value,
    ]

    all_vehicles = []
    vehicle_id_counter = 1
    for tenant in tenants:
        for i, priority in enumerate(priorities_per_tenant):
            vehicle_id = await get_next_id("vehicles")
            vehicle = {
                "vehicle_id": vehicle_id,
                "tenant_id": tenant["tenant_id"],
                "battery_capacity": 60 + (i * 10),  # 60, 70, 80, 90 kWh
                "driver": f"{tenant['site_id'].upper()}-Driver-{vehicle_id_counter}",
                "priority_tier": priority,
                "created_at": now,
                "updated_at": now,
            }
            all_vehicles.append(vehicle)
            vehicle_id_counter += 1
    await mongo_db["vehicles"].insert_many(all_vehicles)

    vehicle_ids = [v["vehicle_id"] for v in all_vehicles]

    # Create 8 active sessions (4 per tenant, one per vehicle)
    # Map: each vehicle gets one charger
    session_start_base = datetime.utcnow() - timedelta(minutes=5)  # Started 5 min ago

    all_sessions = []
    for idx, (vehicle, charger) in enumerate(zip(all_vehicles, all_chargers)):
        session_id = await get_next_id("sessions")
        session = {
            "session_id": session_id,
            "charger_id": charger["charger_id"],
            "vehicle_id": vehicle["vehicle_id"],
            "tenant_id": vehicle["tenant_id"],
            "start_time": session_start_base,
            "end_time": None,
            "kwh": 0.0,
            "allocated_power_kw": 0,  # Will be set by allocator
            "peak_allocated_power_kw": 0,
            "status": SessionStatus.ACTIVE.value,
            "created_at": now,
            "updated_at": now,
        }
        all_sessions.append(session)
        # Mark charger as CHARGING
        charger["status"] = ChargerStatus.CHARGING.value
        charger["updated_at"] = now

    await mongo_db["sessions"].insert_many(all_sessions)
    charger_updates = [
        {"charger_id": c["charger_id"], "status": c["status"], "updated_at": c["updated_at"]}
        for c in all_chargers if c["status"] == ChargerStatus.CHARGING.value
    ]
    if charger_updates:
        for update in charger_updates:
            await mongo_db["chargers"].update_one(
                {"charger_id": update["charger_id"]},
                {"$set": {"status": update["status"], "updated_at": update["updated_at"]}},
            )

    session_ids = [s["session_id"] for s in all_sessions]

    # Pick one session to script-disconnect (last session of tenant A)
    global SCRIPTED_DISCONNECT_SESSION_ID
    SCRIPTED_DISCONNECT_SESSION_ID = all_sessions[3]["session_id"]  # 4th session = last of tenant A

    print(f"[Simulator] Seeded demo data:")
    print(f"  Tenants: {tenant_ids}")
    print(f"  Chargers: {len(charger_ids)} (6 per tenant)")
    print(f"  Vehicles: {len(vehicle_ids)} (4 per tenant, mixed priorities)")
    print(f"  Active Sessions: {len(session_ids)}")
    print(f"  Scripted disconnect session_id: {SCRIPTED_DISCONNECT_SESSION_ID}")
    print(f"  Demo login: site-a / demo123 (tenant_id={tenant_a_id})")
    print(f"  Demo login: site-b / demo123 (tenant_id={tenant_b_id})")

    return {
        "tenant_ids": tenant_ids,
        "charger_ids": charger_ids,
        "vehicle_ids": vehicle_ids,
        "session_ids": session_ids,
    }


async def get_active_sessions_with_details() -> List[dict]:
    """Fetch all active sessions (across tenants) with charger, vehicle, tenant details.

    NOTE: The `requested_kw` returned here uses the same static default
    (min(charger.max_power_kw, 11)) as the allocator for consistency.
    The simulator's live `requested_power_kw` drift (calculated by
    calculate_requested_power) is broadcast via WebSocket for display only;
    the allocator does NOT currently consume this dynamic telemetry.
    This keeps the allocation logic simple and deterministic for the demo.
    """
    sessions = await mongo_db["sessions"].find(
        {"status": SessionStatus.ACTIVE.value}
    ).to_list(length=None)

    if not sessions:
        return []

    charger_ids = [s["charger_id"] for s in sessions]
    vehicle_ids = [s["vehicle_id"] for s in sessions]
    tenant_ids = list({s["tenant_id"] for s in sessions})

    chargers = await mongo_db["chargers"].find(
        {"charger_id": {"$in": charger_ids}}
    ).to_list(length=None)
    vehicles = await mongo_db["vehicles"].find(
        {"vehicle_id": {"$in": vehicle_ids}}
    ).to_list(length=None)
    tenants = await mongo_db["tenants"].find(
        {"tenant_id": {"$in": tenant_ids}}
    ).to_list(length=None)

    charger_map = {c["charger_id"]: c for c in chargers}
    vehicle_map = {v["vehicle_id"]: v for v in vehicles}
    tenant_map = {t["tenant_id"]: t for t in tenants}

    results = []
    for session in sessions:
        charger = charger_map.get(session["charger_id"])
        vehicle = vehicle_map.get(session["vehicle_id"])
        tenant = tenant_map.get(session["tenant_id"])
        if not charger or not vehicle or not tenant:
            continue
        results.append({
            "session": session,
            "charger": charger,
            "vehicle": vehicle,
            "tenant": tenant,
            "requested_kw": min(charger["max_power_kw"], 11),  # Base request
        })
    return results


def calculate_requested_power(base_kw: int, tick: int, session_id: int) -> int:
    """
    Calculate requested power with deterministic drift.
    - Base 3-7 kW range with small random walk
    - Occasional ramp toward max (simulating CC/CV curve)
    """
    # Deterministic pseudo-random based on session_id and tick
    rng = random.Random(42 + session_id * 1000 + tick)

    # Base drift: random walk around 5 kW center
    drift = rng.uniform(-1.5, 1.5)
    requested = max(3, min(7, 5 + drift))

    # Occasional ramp (every ~20 ticks, ramp toward max for 3-5 ticks)
    cycle_pos = tick % 20
    if cycle_pos < 4:  # Ramp phase
        ramp_factor = rng.uniform(0.7, 1.0)  # 70-100% of max
        requested = max(requested, int(11 * ramp_factor))

    return int(round(requested))


async def broadcast_telemetry_update(tenant_id: int, session_updates: List[dict]):
    """Broadcast telemetry updates to tenant's WebSocket connections."""
    if tenant_id not in manager.active_connections:
        return

    message = {
        "type": "telemetry_update",
        "sessions": session_updates,
        "timestamp": datetime.utcnow().isoformat(),
    }
    await manager.broadcast_to_tenant(tenant_id, message)


async def simulator_loop():
    """
    Main simulator loop - runs every 2 seconds.
    For each active session:
    - Update requested_power_kw with deterministic drift
    - Increment kWh based on allocated_power_kw * elapsed_hours
    - Broadcast update via WebSocket
    - Handle scripted disconnect
    """
    tick = 0

    while True:
        try:
            await asyncio.sleep(2.0)
            tick += 1

            active_sessions = await get_active_sessions_with_details()

            if not active_sessions:
                continue

            # Group updates by tenant for batch broadcasting
            tenant_updates: Dict[int, List[dict]] = {}

            for session_data in active_sessions:
                session = session_data["session"]
                charger = session_data["charger"]
                vehicle = session_data["vehicle"]
                tenant = session_data["tenant"]

                # Calculate requested power with drift
                requested_kw = calculate_requested_power(
                    session_data["requested_kw"], tick, session["session_id"]
                )

                # Increment kWh: allocated_power_kw * (2 seconds / 3600) hours
                elapsed_hours = 2.0 / 3600.0
                energy_increment = (session.get("allocated_power_kw") or 0) * elapsed_hours
                new_kwh = float(session.get("kwh") or 0) + energy_increment

                # Update peak allocated if needed
                new_peak = session.get("peak_allocated_power_kw") or 0
                if session.get("allocated_power_kw") and session["allocated_power_kw"] > new_peak:
                    new_peak = session["allocated_power_kw"]

                # Check for scripted disconnect
                global SCRIPTED_DISCONNECT_SESSION_ID, DISCONNECT_AFTER_TICKS
                should_disconnect = (
                    SCRIPTED_DISCONNECT_SESSION_ID is not None and
                    session["session_id"] == SCRIPTED_DISCONNECT_SESSION_ID and
                    tick >= DISCONNECT_AFTER_TICKS
                )

                if should_disconnect:
                    end_time = datetime.utcnow()
                    # Complete the session
                    await mongo_db["sessions"].update_one(
                        {"_id": session["_id"]},
                        {
                            "$set": {
                                "status": SessionStatus.COMPLETED.value,
                                "end_time": end_time,
                                "kwh": new_kwh,
                                "peak_allocated_power_kw": new_peak,
                                "updated_at": end_time,
                            }
                        },
                    )
                    # Free the charger
                    await mongo_db["chargers"].update_one(
                        {"_id": charger["_id"]},
                        {"$set": {"status": ChargerStatus.AVAILABLE.value, "updated_at": end_time}},
                    )

                    # Broadcast session complete event
                    await broadcast_session_event(
                        tenant["tenant_id"],
                        "session_completed",
                        {
                            "session_id": session["session_id"],
                            "charger_id": charger["charger_id"],
                            "vehicle_id": vehicle["vehicle_id"],
                            "driver": vehicle["driver"],
                            "final_kwh": float(new_kwh),
                            "duration_minutes": int((end_time - session["start_time"]).total_seconds() / 60),
                        }
                    )

                    await broadcast_charger_status(
                        tenant["tenant_id"],
                        charger["charger_id"],
                        ChargerStatus.AVAILABLE.value
                    )

                    print(f"[Simulator] Scripted disconnect: session {session['session_id']} completed at tick {tick}")
                    # Clear so it only happens once
                    SCRIPTED_DISCONNECT_SESSION_ID = None
                    continue

                # Persist telemetry update
                await mongo_db["sessions"].update_one(
                    {"_id": session["_id"]},
                    {
                        "$set": {
                            "kwh": new_kwh,
                            "peak_allocated_power_kw": new_peak,
                            "updated_at": datetime.utcnow(),
                        }
                    },
                )

                # Prepare update for broadcast
                update = {
                    "session_id": session["session_id"],
                    "charger_id": charger["charger_id"],
                    "vehicle_id": vehicle["vehicle_id"],
                    "driver": vehicle["driver"],
                    "priority_tier": vehicle.get("priority_tier") or "low",
                    "requested_power_kw": requested_kw,
                    "allocated_power_kw": session.get("allocated_power_kw") or 0,
                    "peak_allocated_power_kw": new_peak,
                    "kwh": round(float(new_kwh), 3),
                    "status": SessionStatus.ACTIVE.value,
                }

                if tenant["tenant_id"] not in tenant_updates:
                    tenant_updates[tenant["tenant_id"]] = []
                tenant_updates[tenant["tenant_id"]].append(update)

            # Broadcast all updates per tenant
            for tenant_id, updates in tenant_updates.items():
                if updates:
                    await broadcast_telemetry_update(tenant_id, updates)

        except asyncio.CancelledError:
            print("[Simulator] Loop cancelled")
            break
        except Exception as e:
            print(f"[Simulator] Loop error: {e}")
            # Continue running


async def run_allocator_for_all_tenants():
    """Run allocator for all tenants (called from simulator or standalone)."""
    from app.api.allocator import run_allocator

    tenants = await mongo_db["tenants"].find().to_list(length=None)
    for tenant in tenants:
        try:
            await run_allocator(tenant["tenant_id"])
        except Exception as e:
            print(f"[Simulator] Allocator error for tenant {tenant['tenant_id']}: {e}")


# For manual testing
async def main():
    """Run seed + a few simulator ticks for verification."""
    from app.api.allocator import run_allocator

    print("Seeding demo data...")
    await seed_demo_data()

    print("Running allocator once...")
    tenants = await mongo_db["tenants"].find().to_list(length=None)
    for tenant in tenants:
        result = await run_allocator(tenant["tenant_id"])
        print(f"  Tenant {tenant['tenant_id']}: allocated {result.total_allocated_kw}/{result.total_requested_kw} kW")

    print("Running simulator for 5 ticks...")
    for i in range(5):
        print(f"\n--- Tick {i+1} ---")
        active_sessions = await get_active_sessions_with_details()
        for sd in active_sessions:
            sid = sd["session"]["session_id"]
            req = calculate_requested_power(5, i, sid)
            print(f"  Session {sid}: req={req}kW, "
                  f"alloc={sd['session'].get('allocated_power_kw') or 0}kW, "
                  f"kWh={sd['session'].get('kwh') or 0:.3f}")
        await asyncio.sleep(0.1)


if __name__ == "__main__":
    asyncio.run(main())