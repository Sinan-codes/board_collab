from app.rooms import get_or_create_room


def test_root_reports_status_and_room_count(client):
    resp = client.get("/")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok", "rooms": 0}


def test_root_reports_room_count_after_room_created(client):
    get_or_create_room("ABCDEF")
    resp = client.get("/")
    assert resp.json() == {"status": "ok", "rooms": 1}


def test_room_exists_false_for_unknown_room(client):
    resp = client.get("/rooms/ABCDEF/exists")
    assert resp.status_code == 200
    assert resp.json() == {"exists": False}


def test_room_exists_true_after_room_created(client):
    get_or_create_room("ABCDEF")
    resp = client.get("/rooms/ABCDEF/exists")
    assert resp.json() == {"exists": True}


def test_room_exists_is_case_insensitive(client):
    get_or_create_room("ABCDEF")
    resp = client.get("/rooms/abcdef/exists")
    assert resp.json() == {"exists": True}
