import asyncio
import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from .connection_manager import broadcast, send_heartbeat
from .rooms import get_or_create_room, rooms, user_list
from .utils import now

router = APIRouter()


@router.websocket("/ws/{room_id}")
async def ws_endpoint(ws: WebSocket, room_id: str):
    await ws.accept()

    username = ws.query_params.get("username", f"Artist{uuid.uuid4().hex[:4].upper()}")
    # Use stable client_id from the browser (sessionStorage) so reconnects replace
    # the old connection rather than adding a duplicate entry.
    user_id = ws.query_params.get("client_id") or uuid.uuid4().hex[:8]

    room = get_or_create_room(room_id)

    # If this client_id already has a slot (e.g. StrictMode double-mount / reconnect),
    # close the old WebSocket silently before taking the slot.
    if user_id in room.connections:
        try:
            await room.connections[user_id]["ws"].close()
        except Exception:
            pass

    room.connections[user_id] = {"ws": ws, "username": username}

    # Send current canvas state + user list to the new joiner
    await ws.send_json({
        "type": "init",
        "userId": user_id,
        "elements": room.elements,
        "users": user_list(room),
    })

    # Notify everyone else that someone joined
    await broadcast(room, {
        "type": "user_joined",
        "userId": user_id,
        "username": username,
        "users": user_list(room),
    }, exclude_id=user_id)

    heartbeat_task = asyncio.create_task(send_heartbeat(ws))

    try:
        while True:
            try:
                data = await ws.receive_json()
            except Exception:
                break

            msg_type = data.get("type")

            if msg_type == "chat":
                # Broadcast to everyone except sender (sender adds optimistically)
                await broadcast(room, {
                    "type": "chat",
                    "text": data.get("text", ""),
                    "sender": username,
                    "senderId": user_id,
                    "time": now(),
                }, exclude_id=user_id)

            elif msg_type == "draw":
                # Completed stroke — persist and broadcast
                el = data.get("element")
                if el:
                    room.elements.append(el)
                    await broadcast(room, {
                        "type": "draw",
                        "element": el,
                        "senderId": user_id,
                    }, exclude_id=user_id)

            elif msg_type == "draw_progress":
                # Live preview while drawing — relay but don't persist
                await broadcast(room, {
                    "type": "draw_progress",
                    "element": data.get("element"),
                    "senderId": user_id,
                }, exclude_id=user_id)

            elif msg_type == "sync":
                # Full canvas replace (sent after undo)
                elements = data.get("elements", [])
                room.elements = elements
                await broadcast(room, {
                    "type": "sync",
                    "elements": elements,
                    "senderId": user_id,
                }, exclude_id=user_id)

            elif msg_type == "cursor":
                # Live pointer position — ephemeral, never persisted
                await broadcast(room, {
                    "type": "cursor",
                    "userId": user_id,
                    "x": data.get("x"),
                    "y": data.get("y"),
                }, exclude_id=user_id)

            elif msg_type == "clear":
                room.elements = []
                await broadcast(room, {
                    "type": "clear",
                    "senderId": user_id,
                }, exclude_id=user_id)

    except WebSocketDisconnect:
        pass
    finally:
        heartbeat_task.cancel()
        # Only clean up if this WS is still the active connection for this user_id.
        # A reconnect may have already replaced it — in that case, do nothing.
        if room.connections.get(user_id, {}).get("ws") is ws:
            room.connections.pop(user_id, None)
            if not room.connections:
                rooms.pop(room_id, None)
            else:
                await broadcast(room, {
                    "type": "user_left",
                    "userId": user_id,
                    "username": username,
                    "users": user_list(room),
                })
