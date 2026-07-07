from typing import Any, Dict, List


class Room:
    def __init__(self, room_id: str):
        self.id = room_id
        self.connections: Dict[str, dict] = {}  # user_id -> {ws, username}
        self.elements: List[Any] = []           # persistent canvas state


rooms: Dict[str, Room] = {}


def get_or_create_room(room_id: str) -> Room:
    if room_id not in rooms:
        rooms[room_id] = Room(room_id)
    return rooms[room_id]


def user_list(room: Room) -> list:
    return [{"id": uid, "username": c["username"]} for uid, c in room.connections.items()]
