from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from datetime import datetime

from app.db.session import get_db, get_next_id
from app.schemas import InvoiceCreate, InvoiceResponse
from app.api.auth import get_current_tenant_id

router = APIRouter()

# Rates for billing
ENERGY_RATE_PER_KWH = 0.30  # $/kWh
DEMAND_RATE_PER_KW = 15.00  # $/kW (monthly demand charge)


@router.post("", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
async def create_invoice(invoice_in: InvoiceCreate, db=Depends(get_db), tenant_id: int = Depends(get_current_tenant_id)):
    if invoice_in.tenant_id != tenant_id:
        raise HTTPException(status_code=403, detail="Cannot create invoice for another tenant")

    now = datetime.utcnow()
    invoice = {
        "invoice_id": await get_next_id("invoices"),
        "tenant_id": tenant_id,
        "period": invoice_in.period,
        "total_kwh": invoice_in.total_kwh,
        "peak_kw": invoice_in.peak_kw,
        "amount": invoice_in.amount,
        "created_at": now,
    }
    await db["invoices"].insert_one(invoice)
    return invoice


@router.get("", response_model=List[InvoiceResponse])
async def list_invoices(db=Depends(get_db), tenant_id: int = Depends(get_current_tenant_id)):
    cursor = db["invoices"].find({"tenant_id": tenant_id}).sort("created_at", -1)
    return await cursor.to_list(length=None)


@router.get("/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(invoice_id: int, db=Depends(get_db), tenant_id: int = Depends(get_current_tenant_id)):
    invoice = await db["invoices"].find_one(
        {"invoice_id": invoice_id, "tenant_id": tenant_id}
    )
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice


@router.post("/generate/{period}", response_model=InvoiceResponse)
async def generate_invoice(period: str, db=Depends(get_db), tenant_id: int = Depends(get_current_tenant_id)):
    """Generate invoice for a period (e.g., '2024-01') from completed sessions."""
    try:
        period_start = datetime.strptime(period, "%Y-%m")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="period must use YYYY-MM format") from exc

    if period_start.month == 12:
        period_end = period_start.replace(year=period_start.year + 1, month=1)
    else:
        period_end = period_start.replace(month=period_start.month + 1)

    # Calculate totals from completed sessions in period
    pipeline = [
        {
            "$match": {
                "tenant_id": tenant_id,
                "status": "completed",
                "end_time": {"$gte": period_start, "$lt": period_end},
            }
        },
        {
            "$group": {
                "_id": None,
                "total_kwh": {"$sum": "$kwh"},
                "peak_kw": {"$max": "$peak_allocated_power_kw"},
            }
        },
    ]
    agg_results = await db["sessions"].aggregate(pipeline).to_list(length=1)
    row = agg_results[0] if agg_results else {"total_kwh": 0, "peak_kw": 0}

    total_kwh = float(row.get("total_kwh") or 0)
    peak_kw = int(row.get("peak_kw") or 0)

    # Calculate amount: energy + demand charge
    energy_cost = total_kwh * ENERGY_RATE_PER_KWH
    demand_cost = peak_kw * DEMAND_RATE_PER_KW
    amount = energy_cost + demand_cost

    now = datetime.utcnow()
    invoice = {
        "invoice_id": await get_next_id("invoices"),
        "tenant_id": tenant_id,
        "period": period,
        "total_kwh": total_kwh,
        "peak_kw": peak_kw,
        "amount": amount,
        "created_at": now,
    }
    await db["invoices"].insert_one(invoice)
    return invoice


@router.get("/{invoice_id}/breakdown")
async def get_invoice_breakdown(invoice_id: int, db=Depends(get_db), tenant_id: int = Depends(get_current_tenant_id)):
    """Get detailed breakdown of invoice."""
    invoice = await db["invoices"].find_one(
        {"invoice_id": invoice_id, "tenant_id": tenant_id}
    )
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    total_kwh = float(invoice["total_kwh"])
    peak_kw = invoice["peak_kw"]

    return {
        "invoice_id": invoice["invoice_id"],
        "period": invoice["period"],
        "energy": {
            "kwh": total_kwh,
            "rate_per_kwh": ENERGY_RATE_PER_KWH,
            "cost": total_kwh * ENERGY_RATE_PER_KWH,
        },
        "demand": {
            "peak_kw": peak_kw,
            "rate_per_kw": DEMAND_RATE_PER_KW,
            "cost": peak_kw * DEMAND_RATE_PER_KW,
        },
        "total_amount": float(invoice["amount"]),
        "savings_vs_uncontrolled": float(peak_kw * 25),  # Estimated savings
    }