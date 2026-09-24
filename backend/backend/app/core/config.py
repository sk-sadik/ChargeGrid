from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List


class Settings(BaseSettings):
    app_name: str = "Charge Grid"
    app_env: str = "development"
    debug: bool = False

    # MongoDB
    mongo_uri: str = "mongodb://localhost:27017"
    mongo_db_name: str = "chargegrid"

    secret_key: str = "your-secret-key-change-in-production-min-32-chars"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    allocator_interval_seconds: int = 60
    site_power_cap_kw: int = 50

    ws_heartbeat_interval: int = 30

    # CORS - explicit list of allowed origins (no "*" with credentials)
    cors_allowed_origins: List[str] = ["http://localhost:3000"]
    # Convenience: single frontend origin (e.g. Vercel prod URL), merged into CORS list
    frontend_url: str = ""

    @property
    def cors_origins(self) -> List[str]:
        origins = list(self.cors_allowed_origins)
        if self.frontend_url and self.frontend_url not in origins:
            origins.append(self.frontend_url)
        return origins

    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()