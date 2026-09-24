from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import get_settings

settings = get_settings()

# Lazy connection: AsyncIOMotorClient does not connect until first operation.
client: AsyncIOMotorClient = AsyncIOMotorClient(
    settings.mongo_uri,
    serverSelectionTimeoutMS=5000,
)

db: AsyncIOMotorDatabase = client[settings.mongo_db_name]


def get_db() -> AsyncIOMotorDatabase:
    """FastAPI dependency returning the Motor MongoDB database handle."""
    return db


async def get_next_id(collection_name: str) -> int:
    """Atomically increment a per-collection sequence and return the new id."""
    counter = await db["counters"].find_one_and_update(
        {"_id": collection_name},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True,
    )
    return counter["seq"]


async def init_db() -> None:
    """Create collections and indexes (idempotent)."""
    # Note: MongoDB's _id index is already unique, so counters need no explicit index.
    await db["tenants"].create_index([("tenant_id", 1)], unique=True)
    await db["tenants"].create_index([("site_id", 1)], unique=True)
    await db["users"].create_index([("user_id", 1)], unique=True)
    await db["users"].create_index([("username", 1)], unique=True)
    await db["users"].create_index([("tenant_id", 1)])
    await db["chargers"].create_index([("charger_id", 1)], unique=True)
    await db["chargers"].create_index([("tenant_id", 1)])
    await db["sessions"].create_index([("session_id", 1)], unique=True)
    await db["sessions"].create_index([("tenant_id", 1)])
    await db["sessions"].create_index([("tenant_id", 1), ("status", 1)])
    await db["vehicles"].create_index([("vehicle_id", 1)], unique=True)
    await db["vehicles"].create_index([("tenant_id", 1)])
    await db["invoices"].create_index([("invoice_id", 1)], unique=True)
    await db["invoices"].create_index([("tenant_id", 1)])


async def close_mongo() -> None:
    client.close()