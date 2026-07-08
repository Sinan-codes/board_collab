from app.connection_manager import broadcast
from app.rooms import Room


class FakeWebSocket:
    def __init__(self, fail: bool = False):
        self.fail = fail
        self.sent: list = []

    async def send_json(self, message):
        if self.fail:
            raise RuntimeError("send failed")
        self.sent.append(message)


async def test_broadcast_sends_to_all_connections():
    room = Room("R1")
    ws1, ws2 = FakeWebSocket(), FakeWebSocket()
    room.connections["u1"] = {"ws": ws1, "username": "Alice"}
    room.connections["u2"] = {"ws": ws2, "username": "Bob"}

    await broadcast(room, {"type": "chat", "text": "hi"})

    assert ws1.sent == [{"type": "chat", "text": "hi"}]
    assert ws2.sent == [{"type": "chat", "text": "hi"}]


async def test_broadcast_excludes_given_id():
    room = Room("R1")
    ws1, ws2 = FakeWebSocket(), FakeWebSocket()
    room.connections["u1"] = {"ws": ws1, "username": "Alice"}
    room.connections["u2"] = {"ws": ws2, "username": "Bob"}

    await broadcast(room, {"type": "chat"}, exclude_id="u1")

    assert ws1.sent == []
    assert ws2.sent == [{"type": "chat"}]


async def test_broadcast_drops_connections_that_fail_to_send():
    room = Room("R1")
    ok, bad = FakeWebSocket(), FakeWebSocket(fail=True)
    room.connections["u1"] = {"ws": ok, "username": "Alice"}
    room.connections["u2"] = {"ws": bad, "username": "Bob"}

    await broadcast(room, {"type": "ping"})

    assert "u1" in room.connections
    assert "u2" not in room.connections
