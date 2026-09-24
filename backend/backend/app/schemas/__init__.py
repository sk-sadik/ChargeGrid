from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.models import ChargerStatus, SessionStatus, PriorityTier


class TenantBase(BaseModel):
    name: str
    site_id: str
    billing_plan: str = "standard"
    site_power_cap_kw: int = 50


class TenantCreate(TenantBase):
    pass


class TenantUpdate(BaseModel):
    name: Optional[str] = None
    billing_plan: Optional[str] = None
    site_power_cap_kw: Optional[int] = None


class TenantResponse(TenantBase):
    tenant_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ChargerBase(BaseModel):
    max_power_kw: int = 11


class ChargerCreate(ChargerBase):
    site_id: str
    tenant_id: int


class ChargerUpdate(BaseModel):
    max_power_kw: Optional[int] = None
    status: Optional[ChargerStatus] = None


class ChargerResponse(ChargerBase):
    charger_id: int
    site_id: str
    tenant_id: int
    status: ChargerStatus
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SessionBase(BaseModel):
    pass


class SessionCreate(SessionBase):
    charger_id: int
    vehicle_id: int
    tenant_id: int


class SessionUpdate(BaseModel):
    end_time: Optional[datetime] = None
    kwh: Optional[float] = None
    allocated_power_kw: Optional[int] = None
    peak_allocated_power_kw: Optional[int] = None
    status: Optional[SessionStatus] = None


class SessionResponse(SessionBase):
    session_id: int
    charger_id: int
    vehicle_id: int
    tenant_id: int
    start_time: datetime
    end_time: Optional[datetime]
    kwh: float
    allocated_power_kw: int
    peak_allocated_power_kw: int
    status: SessionStatus
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class VehicleBase(BaseModel):
    battery_capacity: int
    driver: str
    priority_tier: PriorityTier = PriorityTier.MEDIUM


class VehicleCreate(VehicleBase):
    tenant_id: int


class VehicleUpdate(BaseModel):
    battery_capacity: Optional[int] = None
    driver: Optional[str] = None
    priority_tier: Optional[PriorityTier] = None


class VehicleResponse(VehicleBase):
    vehicle_id: int
    tenant_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InvoiceBase(BaseModel):
    period: str
    total_kwh: float = 0
    peak_kw: int = 0
    amount: float = 0


class InvoiceCreate(InvoiceBase):
    tenant_id: int


class InvoiceResponse(InvoiceBase):
    invoice_id: int
    tenant_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[int] = None
    tenant_id: Optional[int] = None
    role: Optional[str] = None


class UserLogin(BaseModel):
    username: str
    password: str