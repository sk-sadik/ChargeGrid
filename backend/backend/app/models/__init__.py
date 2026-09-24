"""Domain enums and MongoDB collection names.

Entities are stored as MongoDB documents (dicts). The integer business ids
(tenant_id, charger_id, session_id, vehicle_id, invoice_id, user_id) use an
auto-incrementing `counters` collection so the REST API contract stays stable
(ids remain integers).
"""
import enum


class UserRole(str, enum.Enum):
    TENANT_MANAGER = "tenant_manager"
    DRIVER = "driver"


class ChargerStatus(str, enum.Enum):
    AVAILABLE = "available"
    CHARGING = "charging"
    UNAVAILABLE = "unavailable"
    FAULTED = "faulted"


class SessionStatus(str, enum.Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    INTERRUPTED = "interrupted"


class PriorityTier(str, enum.Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


# MongoDB collection names
COLL_USER = "users"
COLL_TENANT = "tenants"
COLL_CHARGER = "chargers"
COLL_SESSION = "sessions"
COLL_VEHICLE = "vehicles"
COLL_INVOICE = "invoices"
COLL_COUNTER = "counters"


__all__ = [
    "UserRole",
    "ChargerStatus",
    "SessionStatus",
    "PriorityTier",
    "COLL_USER",
    "COLL_TENANT",
    "COLL_CHARGER",
    "COLL_SESSION",
    "COLL_VEHICLE",
    "COLL_INVOICE",
    "COLL_COUNTER",
]