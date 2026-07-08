import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.rooms import rooms


@pytest.fixture(autouse=True)
def clear_rooms():
    rooms.clear()
    yield
    rooms.clear()


@pytest.fixture
def client():
    return TestClient(app)
