from fastapi import APIRouter

from .rooms import rooms

router = APIRouter()


@router.get("/")
def root():
    return {"status": "ok", "rooms": len(rooms)}


@router.get("/rooms/{room_id}/exists")
def room_exists(room_id: str):
    return {"exists": room_id.upper() in rooms}
