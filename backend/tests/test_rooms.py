from app.rooms import Room, get_or_create_room, rooms, user_list


def test_get_or_create_room_creates_new_room():
    room = get_or_create_room("XYZ123")
    assert room.id == "XYZ123"
    assert room.connections == {}
    assert room.elements == []
    assert rooms["XYZ123"] is room


def test_get_or_create_room_returns_existing_room():
    first = get_or_create_room("XYZ123")
    second = get_or_create_room("XYZ123")
    assert first is second


def test_user_list_reflects_connections():
    room = Room("R1")
    room.connections["u1"] = {"ws": object(), "username": "Alice"}
    room.connections["u2"] = {"ws": object(), "username": "Bob"}
    assert user_list(room) == [
        {"id": "u1", "username": "Alice"},
        {"id": "u2", "username": "Bob"},
    ]


def test_user_list_empty_for_no_connections():
    room = Room("R1")
    assert user_list(room) == []
