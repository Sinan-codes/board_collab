import asyncio

from fastapi import WebSocket

from .config import HEARTBEAT_INTERVAL, SEND_TIMEOUT
from .rooms import Room


async def broadcast(room: Room, message: dict, exclude_id: str | None = None):
    targets = [(uid, conn) for uid, conn in list(room.connections.items()) if uid != exclude_id]

    async def send_one(uid: str, conn: dict) -> str | None:
        try:
            await asyncio.wait_for(conn["ws"].send_json(message), timeout=SEND_TIMEOUT)
            return None
        except Exception:
            return uid

    results = await asyncio.gather(*(send_one(uid, conn) for uid, conn in targets))
    for uid in results:
        if uid is not None:
            room.connections.pop(uid, None)


async def send_heartbeat(ws: WebSocket):
    while True:
        await asyncio.sleep(HEARTBEAT_INTERVAL)
        await ws.send_json({"type": "ping"})
