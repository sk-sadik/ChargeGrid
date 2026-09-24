"""Database initialization script - run with: python -m app.db.init_db"""
import asyncio
from app.db.session import init_db


async def main():
    print("Initializing database...")
    await init_db()
    print("Database initialized successfully!")


if __name__ == "__main__":
    asyncio.run(main())