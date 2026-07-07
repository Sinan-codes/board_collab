from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .http import router as http_router
from .websocket import router as ws_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(http_router)
app.include_router(ws_router)
