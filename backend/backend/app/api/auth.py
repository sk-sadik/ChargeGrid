from fastapi import APIRouter, Depends, HTTPException, Security, status
from fastapi.security import OAuth2PasswordRequestForm, HTTPBearer, HTTPAuthorizationCredentials
from datetime import timedelta

from app.core.config import get_settings
from app.core.security import create_access_token, verify_password, get_password_hash, verify_token
from app.db.session import get_db, get_next_id
from app.models import UserRole
from app.schemas import Token, UserLogin

router = APIRouter()

settings = get_settings()

security = HTTPBearer(auto_error=False)


async def get_current_tenant_id(credentials: HTTPAuthorizationCredentials = Security(security)) -> int:
    """Extract tenant_id from JWT token. Raises 401 if missing or invalid."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = verify_token(credentials.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    tenant_id = payload.get("tenant_id")
    if not tenant_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing tenant_id claim",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return tenant_id


async def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security), db=Depends(get_db)):
    """Extract user from JWT token and load it from MongoDB. Raises 401 if missing or invalid."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = verify_token(credentials.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing user_id claim",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = await db["users"].find_one({"user_id": int(user_id)})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db=Depends(get_db)):
    """Login with username and password. Returns JWT with tenant_id and role."""
    user = await db["users"].find_one({"username": form_data.username})

    if not user or not verify_password(form_data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": str(user["user_id"]), "tenant_id": user["tenant_id"], "role": user["role"]},
        expires_delta=access_token_expires,
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/register", response_model=Token)
async def register(tenant_data: UserLogin, db=Depends(get_db)):
    """Register a new tenant with an initial tenant_manager user."""
    # Check if site_id already exists
    if await db["tenants"].find_one({"site_id": tenant_data.username}):
        raise HTTPException(status_code=400, detail="Site ID already registered")

    # Check if username already exists
    if await db["users"].find_one({"username": tenant_data.username}):
        raise HTTPException(status_code=400, detail="Username already registered")

    from datetime import datetime
    now = datetime.utcnow()

    # Create tenant
    tenant_id = await get_next_id("tenants")
    tenant = {
        "tenant_id": tenant_id,
        "name": tenant_data.username,
        "site_id": tenant_data.username,
        "billing_plan": "standard",
        "site_power_cap_kw": 50,
        "created_at": now,
        "updated_at": now,
    }
    await db["tenants"].insert_one(tenant)

    # Create initial tenant_manager user
    user_id = await get_next_id("users")
    user = {
        "user_id": user_id,
        "username": tenant_data.username,
        "password_hash": get_password_hash(tenant_data.password),
        "tenant_id": tenant_id,
        "role": UserRole.TENANT_MANAGER.value,
        "created_at": now,
        "updated_at": now,
    }
    await db["users"].insert_one(user)

    access_token = create_access_token(
        data={"sub": str(user_id), "tenant_id": tenant_id, "role": UserRole.TENANT_MANAGER.value}
    )
    return {"access_token": access_token, "token_type": "bearer"}