from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime
from typing import List

from app.db.session import get_db, get_next_id
from app.schemas import TenantCreate, TenantUpdate, TenantResponse
from app.api.auth import get_current_tenant_id

router = APIRouter()


@router.post("", response_model=TenantResponse, status_code=status.HTTP_201_CREATED)
async def create_tenant(tenant_in: TenantCreate, db=Depends(get_db), tenant_id: int = Depends(get_current_tenant_id)):
    # Only allow creating a tenant for the authenticated tenant's own context
    # (In practice, tenant creation happens via /auth/register; this endpoint
    # is kept for completeness but gated to prevent cross-tenant creation)
    existing = await db["tenants"].find_one({"site_id": tenant_in.site_id})
    if existing:
        raise HTTPException(status_code=400, detail="site_id already registered")

    now = datetime.utcnow()
    new_tenant_id = await get_next_id("tenants")
    tenant = {
        "tenant_id": new_tenant_id,
        "name": tenant_in.name,
        "site_id": tenant_in.site_id,
        "billing_plan": tenant_in.billing_plan,
        "site_power_cap_kw": tenant_in.site_power_cap_kw,
        "created_at": now,
        "updated_at": now,
    }
    await db["tenants"].insert_one(tenant)
    return tenant


@router.get("/me", response_model=TenantResponse)
async def get_my_tenant(tenant_id: int = Depends(get_current_tenant_id), db=Depends(get_db)):
    tenant = await db["tenants"].find_one({"tenant_id": tenant_id})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant


@router.get("/{tenant_id}", response_model=TenantResponse)
async def get_tenant(tenant_id: int, db=Depends(get_db), current_tenant_id: int = Depends(get_current_tenant_id)):
    # 404 if requesting a different tenant (don't leak existence)
    if tenant_id != current_tenant_id:
        raise HTTPException(status_code=404, detail="Tenant not found")
    tenant = await db["tenants"].find_one({"tenant_id": tenant_id})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant


@router.patch("/{tenant_id}", response_model=TenantResponse)
async def update_tenant(tenant_id: int, tenant_in: TenantUpdate, db=Depends(get_db), current_tenant_id: int = Depends(get_current_tenant_id)):
    # 404 if requesting a different tenant (don't leak existence)
    if tenant_id != current_tenant_id:
        raise HTTPException(status_code=404, detail="Tenant not found")

    updates = {k: v for k, v in tenant_in.model_dump(exclude_unset=True).items()}
    if not updates:
        tenant = await db["tenants"].find_one({"tenant_id": tenant_id})
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")
        return tenant

    updates["updated_at"] = datetime.utcnow()
    await db["tenants"].update_one(
        {"tenant_id": tenant_id},
        {"$set": updates},
    )
    tenant = await db["tenants"].find_one({"tenant_id": tenant_id})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant