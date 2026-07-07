import { useRef, useEffect, useCallback, useState } from 'react';

const WS_BASE = (import.meta.env.VITE_WS_URL as string | undefined) ?? 'ws://localhost:8000';
export const HTTP_BASE = WS_BASE.replace(/^ws/, 'http');

function getOrCreateClientId(): string {
  const stored = sessionStorage.getItem('bc_client_id');
  if (stored) return stored;
  const id = Math.random().toString(36).slice(2, 11);
  sessionStorage.setItem('bc_client_id', id);
  return id;
}

export interface WSUser { id: string; username: string }

export interface WSHandlers {
  onInit:         (userId: string, elements: any[], users: WSUser[]) => void;
  onDraw:         (element: any, senderId: string) => void;
  onDrawProgress: (element: any, senderId: string) => void;
  onSync:         (elements: any[], senderId: string) => void;
  onClear:        (senderId: string) => void;
  onChat:         (msg: { text: string; sender: string; senderId: string; time: string }) => void;
  onUserJoined:   (userId: string, username: string, users: WSUser[]) => void;
  onUserLeft:     (userId: string, username: string, users: WSUser[]) => void;
  onCursor:       (userId: string, x: number, y: number) => void;
}

export function useCollabWS(roomId: string, username: string, handlers: WSHandlers) {
  const wsRef       = useRef<WebSocket | null>(null);
  const handlersRef = useRef(handlers);
  const reconnRef   = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const deadRef     = useRef(false);
  const [connected, setConnected] = useState(false);

  // Keep handlers fresh without triggering reconnect
  handlersRef.current = handlers;

  const connect = useCallback(() => {    // eslint-disable-line react-hooks/exhaustive-deps
    if (deadRef.current) return;
    const clientId = getOrCreateClientId();
    const url = `${WS_BASE}/ws/${encodeURIComponent(roomId)}?username=${encodeURIComponent(username)}&client_id=${encodeURIComponent(clientId)}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);

    ws.onmessage = ({ data }) => {
      let msg: any;
      try { msg = JSON.parse(data); } catch { return; }
      const h = handlersRef.current;
      switch (msg.type) {
        case 'init':          h.onInit(msg.userId, msg.elements ?? [], msg.users ?? []); break;
        case 'draw':          h.onDraw(msg.element, msg.senderId); break;
        case 'draw_progress': h.onDrawProgress(msg.element, msg.senderId); break;
        case 'sync':          h.onSync(msg.elements ?? [], msg.senderId); break;
        case 'clear':         h.onClear(msg.senderId); break;
        case 'chat':          h.onChat({ text: msg.text, sender: msg.sender, senderId: msg.senderId, time: msg.time }); break;
        case 'user_joined':   h.onUserJoined(msg.userId, msg.username, msg.users ?? []); break;
        case 'user_left':     h.onUserLeft(msg.userId, msg.username, msg.users ?? []); break;
        case 'cursor':        h.onCursor(msg.userId, msg.x, msg.y); break;
      }
    };

    ws.onclose = () => {
      setConnected(false);
      if (!deadRef.current) reconnRef.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => ws.close();
  }, [roomId, username]);

  useEffect(() => {
    deadRef.current = false;
    connect();
    return () => {
      deadRef.current = true;
      clearTimeout(reconnRef.current);
      const ws = wsRef.current;
      if (ws) {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onclose = null;
        ws.onerror = null;
        ws.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  const send = useCallback((msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  return { send, connected };
}
