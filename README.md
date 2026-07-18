<div align="center">

# BoardCollab

**Real-time collaborative whiteboard** — draw, chat, and see your team's cursors move, live, in the browser.

[![Backend tests](https://github.com/Sinan-codes/board_collab/actions/workflows/backend-tests.yml/badge.svg)](https://github.com/Sinan-codes/board_collab/actions/workflows/backend-tests.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[**Live Demo**](https://boardcollab.onrender.com/) · [Report a Bug](https://github.com/Sinan-codes/board_collab/issues)

</div>

---

## What is this?

BoardCollab is an [Excalidraw](https://excalidraw.com/)-inspired whiteboard where multiple people draw on the same canvas over a WebSocket connection. Create a room, share the 6-character code, and everyone sees strokes, cursors, and chat messages appear instantly — no page refresh, no polling.

It's a full-stack project built to demonstrate real-time systems design: WebSocket fan-out and connection lifecycle handling (reconnects, disconnects, presence) on top of a fast in-memory room model.

> ⚠️ The demo above is hosted on Render's free tier — the backend spins down after inactivity, so the first request can take up to a minute to wake it up. Canvas state also lives in memory only, so it resets whenever the backend restarts.

## Features

- **Live multiplayer drawing** — pen, eraser, rectangle, ellipse, line, arrow, text, and selection tools, each with a keyboard shortcut (`v h p e r o l a t`)
- **Real-time cursors** — see collaborators' pointers move across the canvas as they draw
- **Room-based sessions** — create a room and share a short code; anyone who joins sees the current canvas state instantly
- **Resilient connections** — stable per-client IDs mean a page refresh or flaky network reconnects into the same session instead of duplicating a user
- **Group chat** — a sidebar for text chat alongside the canvas, scoped per room
- **Undo / redo** — full history stack, synced across all connected clients
- **Responsive UI** — scrollable toolbar and full-screen chat overlay on mobile

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, [react-konva](https://konvajs.org/) (canvas rendering) |
| Backend | FastAPI, native WebSockets |
| Testing | pytest + pytest-asyncio |
| CI | GitHub Actions (backend test suite on every push/PR) |
| Deployment | Render — FastAPI web service + static frontend site |

## Architecture

```
  Browser A                               FastAPI app
┌───────────┐   WebSocket JSON   ┌───────────────────────────┐
│react-konva│◀ ─ ─ ─ ─ ─ ─ ─ ─ ─▶│      /ws/{room_id}        │
└───────────┘  draw / cursor /   │           │               │
 Browser B      chat / sync      │           ▼               │
┌───────────┐                    │  Room registry (in-memory)│
│react-konva│◀ ─ ─ ─ ─ ─ ─ ─ ─ ─▶│  strokes fan out to peers │
└───────────┘                    └───────────────────────────┘
```

Each room's canvas state and connection list live entirely in server memory for the lowest possible broadcast latency. There's no database yet — a server restart clears every room. (A Postgres-backed persistence layer is in progress on the `feature/postgres-persistance` branch.)

Backend code is organized by concern rather than as a single file:

```
backend/app/
├── main.py               # FastAPI app assembly
├── config.py              # heartbeat / send-timeout settings
├── http.py                 # REST endpoints (health, room existence check)
├── websocket.py            # /ws/{room_id} — the collaboration protocol
├── connection_manager.py   # broadcast + heartbeat helpers
└── rooms.py                 # in-memory room registry
```

## Getting started

### Prerequisites

- Node.js 20+
- Python 3.12+

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt

fastapi dev app/main.py       # http://localhost:8000
```

### Frontend

```bash
cd frontend/app
npm install
npm run dev                   # http://localhost:5173
```

By default the frontend connects to `ws://localhost:8000`. To point it at a different backend, set `VITE_WS_URL` (e.g. `wss://your-backend.onrender.com`) before building.

### Running tests

```bash
cd backend
pytest -v
```

## How a drawing session works

1. A client opens `HomePage`, creates or joins a room, and is routed to `RoomPage` with a room code.
2. `RoomPage` opens a WebSocket to `/ws/{room_id}` with a stable `client_id` (persisted in `sessionStorage`) and a display name.
3. The server sends an `init` event with the room's current elements and connected users, then broadcasts `user_joined` to everyone else.
4. As the user draws, `draw_progress` events stream live previews to other clients; a completed stroke sends a `draw` event, which the server appends to the room's in-memory element list.
5. Undo/redo emits a `sync` event with the full element list, keeping every client's canvas consistent.
6. On disconnect, the server cleans up the room's connection map and broadcasts `user_left` — reconnecting with the same `client_id` replaces the old slot instead of duplicating it. Once the last client leaves, the room (and its canvas) is dropped from memory.

## License

MIT © [Mohamed Kassim Sinan](LICENSE)
