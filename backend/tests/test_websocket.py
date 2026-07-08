from app.rooms import rooms


def test_join_sends_init_with_userid_and_empty_state(client):
    with client.websocket_connect("/ws/ROOM1?username=Alice&client_id=u1") as ws:
        msg = ws.receive_json()
        assert msg["type"] == "init"
        assert msg["userId"] == "u1"
        assert msg["elements"] == []
        assert msg["users"] == [{"id": "u1", "username": "Alice"}]


def test_second_user_join_notifies_first_user(client):
    with client.websocket_connect("/ws/ROOM1?username=Alice&client_id=u1") as ws1:
        ws1.receive_json()  # init

        with client.websocket_connect("/ws/ROOM1?username=Bob&client_id=u2") as ws2:
            init = ws2.receive_json()
            assert init["users"] == [
                {"id": "u1", "username": "Alice"},
                {"id": "u2", "username": "Bob"},
            ]

            notify = ws1.receive_json()
            assert notify["type"] == "user_joined"
            assert notify["userId"] == "u2"
            assert notify["username"] == "Bob"


def test_chat_message_is_broadcast_to_other_users_not_sender(client):
    with client.websocket_connect("/ws/ROOM1?username=Alice&client_id=u1") as ws1:
        ws1.receive_json()  # init

        with client.websocket_connect("/ws/ROOM1?username=Bob&client_id=u2") as ws2:
            ws2.receive_json()  # init
            ws1.receive_json()  # user_joined

            ws1.send_json({"type": "chat", "text": "hello"})

            chat = ws2.receive_json()
            assert chat["type"] == "chat"
            assert chat["text"] == "hello"
            assert chat["sender"] == "Alice"
            assert chat["senderId"] == "u1"


def test_draw_element_is_persisted_and_sent_to_new_joiner(client):
    with client.websocket_connect("/ws/ROOM1?username=Alice&client_id=u1") as ws1:
        ws1.receive_json()  # init
        element = {"type": "rect", "x": 1, "y": 2}
        ws1.send_json({"type": "draw", "element": element})

        with client.websocket_connect("/ws/ROOM1?username=Bob&client_id=u2") as ws2:
            init = ws2.receive_json()
            assert init["elements"] == [element]

            # sender's next message is the join notification, not an echo of its own draw
            notify = ws1.receive_json()
            assert notify["type"] == "user_joined"


def test_draw_is_broadcast_to_other_connected_users(client):
    with client.websocket_connect("/ws/ROOM1?username=Alice&client_id=u1") as ws1:
        ws1.receive_json()  # init

        with client.websocket_connect("/ws/ROOM1?username=Bob&client_id=u2") as ws2:
            ws2.receive_json()  # init
            ws1.receive_json()  # user_joined

            element = {"type": "rect"}
            ws1.send_json({"type": "draw", "element": element})

            msg = ws2.receive_json()
            assert msg == {"type": "draw", "element": element, "senderId": "u1"}


def test_draw_progress_is_relayed_but_not_persisted(client):
    with client.websocket_connect("/ws/ROOM1?username=Alice&client_id=u1") as ws1:
        ws1.receive_json()  # init

        with client.websocket_connect("/ws/ROOM1?username=Bob&client_id=u2") as ws2:
            ws2.receive_json()  # init
            ws1.receive_json()  # user_joined

            ws1.send_json({"type": "draw_progress", "element": {"x": 1}})

            msg = ws2.receive_json()
            assert msg["type"] == "draw_progress"
            assert rooms["ROOM1"].elements == []


def test_sync_replaces_room_elements(client):
    with client.websocket_connect("/ws/ROOM1?username=Alice&client_id=u1") as ws1:
        ws1.receive_json()  # init

        with client.websocket_connect("/ws/ROOM1?username=Bob&client_id=u2") as ws2:
            ws2.receive_json()  # init
            ws1.receive_json()  # user_joined

            new_elements = [{"type": "line"}]
            ws1.send_json({"type": "sync", "elements": new_elements})

            msg = ws2.receive_json()
            assert msg == {"type": "sync", "elements": new_elements, "senderId": "u1"}
            assert rooms["ROOM1"].elements == new_elements


def test_clear_resets_room_elements(client):
    with client.websocket_connect("/ws/ROOM1?username=Alice&client_id=u1") as ws1:
        ws1.receive_json()  # init
        ws1.send_json({"type": "draw", "element": {"x": 1}})

        with client.websocket_connect("/ws/ROOM1?username=Bob&client_id=u2") as ws2:
            ws2.receive_json()  # init
            ws1.receive_json()  # user_joined

            ws1.send_json({"type": "clear"})

            msg = ws2.receive_json()
            assert msg == {"type": "clear", "senderId": "u1"}
            assert rooms["ROOM1"].elements == []


def test_cursor_position_is_relayed_to_others(client):
    with client.websocket_connect("/ws/ROOM1?username=Alice&client_id=u1") as ws1:
        ws1.receive_json()  # init

        with client.websocket_connect("/ws/ROOM1?username=Bob&client_id=u2") as ws2:
            ws2.receive_json()  # init
            ws1.receive_json()  # user_joined

            ws1.send_json({"type": "cursor", "x": 10, "y": 20})

            msg = ws2.receive_json()
            assert msg == {"type": "cursor", "userId": "u1", "x": 10, "y": 20}


def test_room_is_removed_when_last_user_disconnects(client):
    with client.websocket_connect("/ws/ROOM1?username=Alice&client_id=u1") as ws1:
        ws1.receive_json()  # init
        assert "ROOM1" in rooms

    assert "ROOM1" not in rooms


def test_other_users_are_notified_when_someone_leaves(client):
    with client.websocket_connect("/ws/ROOM1?username=Alice&client_id=u1") as ws1:
        ws1.receive_json()  # init

        with client.websocket_connect("/ws/ROOM1?username=Bob&client_id=u2") as ws2:
            ws2.receive_json()  # init
            ws1.receive_json()  # user_joined

        notify = ws1.receive_json()
        assert notify["type"] == "user_left"
        assert notify["userId"] == "u2"
        assert rooms["ROOM1"].connections.keys() == {"u1"}


def test_reconnect_with_same_client_id_keeps_single_connection(client):
    with client.websocket_connect("/ws/ROOM1?username=Alice&client_id=u1") as ws1:
        ws1.receive_json()  # init

        with client.websocket_connect("/ws/ROOM1?username=Alice&client_id=u1") as ws2:
            init = ws2.receive_json()
            assert init["userId"] == "u1"
            assert len(rooms["ROOM1"].connections) == 1
