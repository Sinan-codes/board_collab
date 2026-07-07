from datetime import datetime


def now() -> str:
    return datetime.now().strftime("%H:%M")
