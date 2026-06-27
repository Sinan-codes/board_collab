import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Stage, Layer, Line, Rect, Ellipse, Arrow as KonvaArrow, Text as KonvaText } from 'react-konva';
import { useCollabWS, type WSUser } from '../hooks/useCollabWS';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tool = 'select' | 'pan' | 'pen' | 'eraser' | 'rect' | 'ellipse' | 'line' | 'arrow' | 'text';

interface BaseEl { id: string; color: string; strokeWidth: number; userId?: string }
interface PenEl     extends BaseEl { type: 'pen' | 'eraser'; points: number[] }
interface RectEl    extends BaseEl { type: 'rect';    x: number; y: number; w: number; h: number; fill: string }
interface EllipseEl extends BaseEl { type: 'ellipse'; cx: number; cy: number; rx: number; ry: number; fill: string }
interface LineEl    extends BaseEl { type: 'line';    points: number[] }
interface ArrowEl   extends BaseEl { type: 'arrow';   points: number[] }
interface TextEl    extends BaseEl { type: 'text';    x: number; y: number; text: string; fontSize: number }
type DrawEl = PenEl | RectEl | EllipseEl | LineEl | ArrowEl | TextEl;

interface ChatMsg { id: string; text: string; sender: string; time: string; isMe: boolean; system?: boolean }

// ─── Constants ────────────────────────────────────────────────────────────────

const PALETTE = ['#1a1a2e','#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#6965db','#a855f7','#ec4899'];
const STROKE_WIDTHS = [1, 2, 4, 8];
const genId = () => Math.random().toString(36).slice(2, 9);

function nowStr() {
  const d = new Date();
  return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const Icon = ({ d, size = 18 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const Icons = {
  select:  <Icon d="M5 3l14 9-7 1-3 6L5 3z" />,
  pan:     <Icon d="M18 11V6l-2-2H8L6 6v5H3l9 10 9-10h-3zM8 6h8v5H8V6z" />,
  pen:     <Icon d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />,
  eraser:  <Icon d="M20 20H7L3 16l10-10 7 7-3.5 3.5M6.5 17.5l10-10" />,
  rect:    <Icon d="M3 3h18v18H3z" />,
  ellipse: <Icon d="M12 5C7 5 3 8.1 3 12s4 7 9 7 9-3.1 9-7-4-7-9-7z" />,
  line:    <Icon d="M5 19L19 5" />,
  arrow:   <Icon d="M5 12h14M13 5l7 7-7 7" />,
  text:    <Icon d="M4 6h16M4 12h10M4 18h6" />,
  undo:    <Icon d="M3 7v6h6M3 13a9 9 0 103-6.7" />,
  redo:    <Icon d="M21 7v6h-6M21 13a9 9 0 11-3-6.7" />,
  trash:   <Icon d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />,
  share:   <Icon d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />,
  chat:    <Icon d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />,
  close:   <Icon d="M18 6L6 18M6 6l12 12" />,
  send:    <Icon d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />,
  copy:    <Icon d="M8 4H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2M8 4a2 2 0 012-2h4a2 2 0 012 2M8 4h8" />,
  check:   <Icon d="M20 6L9 17l-5-5" />,
};

const TOOLS: { id: Tool; icon: React.ReactNode; label: string; key: string }[] = [
  { id: 'select',  icon: Icons.select,  label: 'Select',    key: 'v' },
  { id: 'pan',     icon: Icons.pan,     label: 'Pan',       key: 'h' },
  { id: 'pen',     icon: Icons.pen,     label: 'Pen',       key: 'p' },
  { id: 'eraser',  icon: Icons.eraser,  label: 'Eraser',    key: 'e' },
  { id: 'rect',    icon: Icons.rect,    label: 'Rectangle', key: 'r' },
  { id: 'ellipse', icon: Icons.ellipse, label: 'Ellipse',   key: 'o' },
  { id: 'line',    icon: Icons.line,    label: 'Line',      key: 'l' },
  { id: 'arrow',   icon: Icons.arrow,   label: 'Arrow',     key: 'a' },
  { id: 'text',    icon: Icons.text,    label: 'Text',      key: 't' },
];

// ─── Element renderer (shared for local + remote) ─────────────────────────────

function renderEl(el: DrawEl) {
  switch (el.type) {
    case 'pen':
      return <Line key={el.id} points={el.points} stroke={el.color} strokeWidth={el.strokeWidth}
               tension={0.5} lineCap="round" lineJoin="round" globalCompositeOperation="source-over" />;
    case 'eraser':
      return <Line key={el.id} points={el.points} stroke="#ffffff" strokeWidth={el.strokeWidth}
               tension={0.5} lineCap="round" lineJoin="round" globalCompositeOperation="destination-out" />;
    case 'rect':
      return <Rect key={el.id}
               x={el.w < 0 ? el.x + el.w : el.x} y={el.h < 0 ? el.y + el.h : el.y}
               width={Math.abs(el.w)} height={Math.abs(el.h)}
               stroke={el.color} strokeWidth={el.strokeWidth} fill={el.fill} />;
    case 'ellipse':
      return <Ellipse key={el.id} x={el.cx} y={el.cy} radiusX={el.rx || 1} radiusY={el.ry || 1}
               stroke={el.color} strokeWidth={el.strokeWidth} fill={el.fill} />;
    case 'line':
      return <Line key={el.id} points={el.points} stroke={el.color} strokeWidth={el.strokeWidth} lineCap="round" />;
    case 'arrow':
      return <KonvaArrow key={el.id} points={el.points} stroke={el.color} fill={el.color}
               strokeWidth={el.strokeWidth} pointerLength={10} pointerWidth={8} />;
    case 'text':
      return <KonvaText key={el.id} x={el.x} y={el.y} text={el.text}
               fontSize={el.fontSize} fill={el.color} fontFamily="Caveat, cursive" />;
    default:
      return null;
  }
}

// ─── RoomPage ─────────────────────────────────────────────────────────────────

interface RoomPageProps { roomId: string; username: string; onLeave: () => void }

export default function RoomPage({ roomId, username, onLeave }: RoomPageProps) {

  // ── Drawing state ──────────────────────────────────────────────────────────
  const [tool, setTool]   = useState<Tool>('pen');
  const [color, setColor] = useState('#1a1a2e');
  const [fill, setFill]   = useState('transparent');
  const [sw, setSw]       = useState(2);
  const [elements, setElements] = useState<DrawEl[]>([]);

  const isDrawing     = useRef(false);
  const currentEl     = useRef<DrawEl | null>(null);
  const myUserIdRef   = useRef<string>('');
  const myUndoneEls   = useRef<DrawEl[]>([]); // per-user redo stack
  const lastProgress  = useRef(0);            // throttle draw_progress

  // ── Remote live previews (other users currently drawing) ───────────────────
  const [remotePreviews, setRemotePreviews] = useState<Record<string, DrawEl>>({});

  // ── Stage size ─────────────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageW, setStageW] = useState(800);
  const [stageH, setStageH] = useState(600);

  // ── Text overlay ───────────────────────────────────────────────────────────
  const [textPos, setTextPos] = useState<{ x: number; y: number } | null>(null);
  const [textVal, setTextVal] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Chat ───────────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<ChatMsg[]>([
    { id: '0', text: 'Room ready — share the code to invite others.', sender: 'System', time: nowStr(), isMe: false, system: true },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatOpen, setChatOpen]   = useState(false);
  const messagesEnd = useRef<HTMLDivElement>(null);

  // ── Online users ───────────────────────────────────────────────────────────
  const [onlineUsers, setOnlineUsers] = useState<WSUser[]>([]);

  // ── Misc UI ────────────────────────────────────────────────────────────────
  const [copied, setCopied] = useState(false);

  // ─── WebSocket handlers ────────────────────────────────────────────────────
  const { send, connected } = useCollabWS(roomId, username, {
    onInit: (userId, els, users) => {
      myUserIdRef.current = userId;
      setElements(els);
      setOnlineUsers(users);
    },
    onDraw: (el) => {
      setElements(prev => [...prev, el]);
      // Remove that user's in-progress preview
      setRemotePreviews(prev => { const n = { ...prev }; delete n[el.userId ?? el.id]; return n; });
    },
    onDrawProgress: (el, senderId) => {
      if (!el) return;
      setRemotePreviews(prev => ({ ...prev, [senderId]: el }));
    },
    onSync: (els) => {
      setElements(els);
    },
    onClear: () => {
      setElements([]);
      setRemotePreviews({});
    },
    onChat: ({ text, sender, time }) => {
      setMessages(prev => [...prev, { id: genId(), text, sender, time, isMe: false }]);
    },
    onUserJoined: (userId, uname, users) => {
      setOnlineUsers(users);
      if (userId !== myUserIdRef.current) {
        setMessages(prev => [...prev, {
          id: genId(), text: `${uname} joined the room`, sender: 'System', time: nowStr(), isMe: false, system: true,
        }]);
      }
    },
    onUserLeft: (_userId, uname, users) => {
      setOnlineUsers(users);
      setMessages(prev => [...prev, {
        id: genId(), text: `${uname} left the room`, sender: 'System', time: nowStr(), isMe: false, system: true,
      }]);
    },
  });

  // ─── Side effects ──────────────────────────────────────────────────────────

  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        setStageW(containerRef.current.offsetWidth);
        setStageH(containerRef.current.offsetHeight);
      }
    };
    update();
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { if (textPos) textareaRef.current?.focus(); }, [textPos]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); return; }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) { e.preventDefault(); redo(); return; }
      const t = TOOLS.find(t => t.key === e.key);
      if (t) setTool(t.id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ─── Undo / Redo (per-user: only undoes your own strokes) ─────────────────

  const undo = useCallback(() => {
    const myId = myUserIdRef.current;
    setElements(prev => {
      for (let i = prev.length - 1; i >= 0; i--) {
        if (prev[i].userId === myId) {
          myUndoneEls.current = [...myUndoneEls.current, prev[i]];
          const next = [...prev.slice(0, i), ...prev.slice(i + 1)];
          send({ type: 'sync', elements: next });
          return next;
        }
      }
      return prev;
    });
  }, [send]);

  const redo = useCallback(() => {
    if (myUndoneEls.current.length === 0) return;
    const el = myUndoneEls.current[myUndoneEls.current.length - 1];
    myUndoneEls.current = myUndoneEls.current.slice(0, -1);
    setElements(prev => {
      const next = [...prev, el];
      send({ type: 'sync', elements: next });
      return next;
    });
  }, [send]);

  const clearAll = useCallback(() => {
    setElements([]);
    setRemotePreviews({});
    send({ type: 'clear' });
  }, [send]);

  // ─── Drawing handlers ──────────────────────────────────────────────────────

  const getPos = (e: any) => e.target.getStage()?.getPointerPosition() ?? null;

  const handleDown = (e: any) => {
    if (tool === 'select' || tool === 'pan') return;
    if (tool === 'text') {
      const pos = getPos(e);
      if (pos) { setTextPos(pos); setTextVal(''); }
      return;
    }
    const pos = getPos(e);
    if (!pos) return;
    isDrawing.current = true;
    myUndoneEls.current = []; // new stroke clears redo stack

    const base: BaseEl = {
      id: `${myUserIdRef.current}-${genId()}`,
      color: tool === 'eraser' ? '#ffffff' : color,
      strokeWidth: tool === 'eraser' ? sw * 6 : sw,
      userId: myUserIdRef.current,
    };

    let el: DrawEl;
    switch (tool) {
      case 'pen':     el = { ...base, type: 'pen',     points: [pos.x, pos.y] }; break;
      case 'eraser':  el = { ...base, type: 'eraser',  points: [pos.x, pos.y] }; break;
      case 'rect':    el = { ...base, type: 'rect',    x: pos.x, y: pos.y, w: 0, h: 0, fill }; break;
      case 'ellipse': el = { ...base, type: 'ellipse', cx: pos.x, cy: pos.y, rx: 0, ry: 0, fill }; break;
      case 'line':    el = { ...base, type: 'line',    points: [pos.x, pos.y, pos.x, pos.y] }; break;
      case 'arrow':   el = { ...base, type: 'arrow',   points: [pos.x, pos.y, pos.x, pos.y] }; break;
      default: return;
    }
    currentEl.current = el;
    setElements(prev => [...prev, el]);
  };

  const handleMove = (e: any) => {
    if (!isDrawing.current || !currentEl.current) return;
    const pos = getPos(e);
    if (!pos) return;
    const el = currentEl.current;
    let updated: DrawEl;

    switch (el.type) {
      case 'pen':
      case 'eraser':  updated = { ...el, points: [...el.points, pos.x, pos.y] }; break;
      case 'rect':    updated = { ...el, w: pos.x - el.x, h: pos.y - el.y }; break;
      case 'ellipse': updated = { ...el, rx: Math.abs(pos.x - el.cx), ry: Math.abs(pos.y - el.cy) }; break;
      case 'line':
      case 'arrow':   updated = { ...el, points: [el.points[0], el.points[1], pos.x, pos.y] }; break;
      default: return;
    }

    currentEl.current = updated;
    setElements(prev => [...prev.slice(0, -1), updated]);

    // Throttled live preview broadcast (~20 fps)
    const now = Date.now();
    if (now - lastProgress.current > 50) {
      lastProgress.current = now;
      send({ type: 'draw_progress', element: updated });
    }
  };

  const handleUp = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    const el = currentEl.current;
    currentEl.current = null;
    if (el) send({ type: 'draw', element: el });
  };

  const commitText = () => {
    if (!textPos || !textVal.trim()) { setTextPos(null); setTextVal(''); return; }
    const el: TextEl = {
      id: `${myUserIdRef.current}-${genId()}`,
      type: 'text',
      x: textPos.x, y: textPos.y,
      text: textVal,
      color, strokeWidth: sw, fontSize: 20,
      userId: myUserIdRef.current,
    };
    setElements(prev => [...prev, el]);
    send({ type: 'draw', element: el });
    setTextPos(null); setTextVal('');
    myUndoneEls.current = [];
  };

  // ─── Chat ──────────────────────────────────────────────────────────────────

  const sendMsg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    // Optimistic add for sender
    setMessages(prev => [...prev, {
      id: genId(), text: chatInput.trim(), sender: username, time: nowStr(), isMe: true,
    }]);
    send({ type: 'chat', text: chatInput.trim() });
    setChatInput('');
  };

  // ─── Copy room code ────────────────────────────────────────────────────────

  const copyCode = () => {
    navigator.clipboard.writeText(roomId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const cursor = ({
    select: 'default', pan: 'grab', pen: 'crosshair', eraser: 'cell',
    text: 'text', rect: 'crosshair', ellipse: 'crosshair', line: 'crosshair', arrow: 'crosshair',
  } as Record<Tool, string>)[tool];

  // ─── JSX ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-white select-none"
      style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* ── Top bar ── */}
      <header className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-white z-20 shrink-0">

        {/* Leave */}
        <button onClick={onLeave}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors px-2 py-1 rounded-lg hover:bg-gray-100">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          <span className="hidden sm:inline">Leave</span>
        </button>

        {/* Room code */}
        <button onClick={copyCode}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all"
          title="Copy room code">
          <span className="font-mono font-semibold tracking-widest text-indigo-600 text-xs">{roomId}</span>
          {copied
            ? <span className="text-green-500">{Icons.check}</span>
            : <span className="text-gray-400">{Icons.copy}</span>}
        </button>

        {/* Connection status */}
        <div className="flex items-center gap-1.5" title={connected ? 'Connected' : 'Reconnecting…'}>
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-amber-400 animate-pulse'}`} />
          <span className="text-xs text-gray-400 hidden sm:block">{connected ? 'Live' : 'Connecting…'}</span>
        </div>

        <div className="flex-1" />

        {/* Undo / Redo / Clear */}
        <button onClick={undo} title="Undo (Ctrl+Z)"
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors">
          {Icons.undo}
        </button>
        <button onClick={redo} title="Redo (Ctrl+Y)"
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors">
          {Icons.redo}
        </button>
        <button onClick={clearAll} title="Clear canvas"
          className="p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors">
          {Icons.trash}
        </button>

        <div className="w-px h-5 bg-gray-200 mx-1" />

        {/* Share */}
        <button onClick={copyCode}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors">
          {Icons.share}
          <span>Share</span>
        </button>

        {/* Chat toggle */}
        <button onClick={() => setChatOpen(o => !o)}
          className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border
            ${chatOpen ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
          {Icons.chat}
          <span className="hidden sm:inline">Chat</span>
          {onlineUsers.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {onlineUsers.length}
            </span>
          )}
        </button>
      </header>

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-gray-100 bg-white z-10 shrink-0 overflow-x-auto"
        style={{ scrollbarWidth: 'none' }}>

        {TOOLS.map(t => (
          <button key={t.id} onClick={() => setTool(t.id)} title={`${t.label} (${t.key})`}
            className={`p-2 rounded-lg transition-all shrink-0 ${tool === t.id
              ? 'bg-indigo-100 text-indigo-700 shadow-sm'
              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'}`}>
            {t.icon}
          </button>
        ))}

        <div className="w-px h-6 bg-gray-200 mx-1.5 shrink-0" />

        {/* Color palette */}
        {PALETTE.map(c => (
          <button key={c} onClick={() => setColor(c)}
            className="shrink-0 w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
            style={{
              backgroundColor: c,
              borderColor: color === c ? '#6965db' : 'transparent',
              outline: color === c ? '2px solid #6965db' : 'none',
              outlineOffset: '1px',
            }} />
        ))}
        {/* Custom color picker */}
        <label title="Custom color"
          className="shrink-0 w-6 h-6 rounded-full border-2 border-dashed border-gray-300 hover:border-indigo-400 cursor-pointer flex items-center justify-center relative overflow-hidden">
          <input type="color" value={color} onChange={e => setColor(e.target.value)}
            className="opacity-0 absolute inset-0 w-full h-full cursor-pointer" />
          <span className="text-gray-400 text-xs pointer-events-none">+</span>
        </label>

        <div className="w-px h-6 bg-gray-200 mx-1.5 shrink-0" />

        {/* Fill toggle */}
        <button onClick={() => setFill(fill === 'transparent' ? color : 'transparent')}
          title="Toggle fill"
          className="shrink-0 w-6 h-6 rounded border-2 border-gray-300 hover:border-indigo-400 transition-colors flex items-center justify-center"
          style={{ backgroundColor: fill === 'transparent' ? 'white' : fill }}>
          {fill === 'transparent' && <span className="text-gray-300 text-[10px] leading-none">∅</span>}
        </button>

        <div className="w-px h-6 bg-gray-200 mx-1.5 shrink-0" />

        {/* Stroke widths */}
        {STROKE_WIDTHS.map(w => (
          <button key={w} onClick={() => setSw(w)} title={`Stroke ${w}px`}
            className={`shrink-0 flex items-center justify-center w-8 h-7 rounded-lg transition-all ${
              sw === w ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'}`}>
            <div className="bg-current rounded-full" style={{ width: Math.min(w * 3.5, 22), height: w }} />
          </button>
        ))}
      </div>

      {/* ── Main area ── */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* Canvas */}
        <div ref={containerRef} className="flex-1 relative bg-white overflow-hidden" style={{ cursor }}>
          <Stage
            width={stageW} height={stageH}
            onMouseDown={handleDown} onMousemove={handleMove} onMouseup={handleUp}
            onTouchStart={handleDown} onTouchMove={handleMove} onTouchEnd={handleUp}
          >
            {/* Completed elements */}
            <Layer>{elements.map(renderEl)}</Layer>
            {/* Remote live previews (semi-transparent) */}
            <Layer opacity={0.6}>
              {Object.values(remotePreviews).map(el => renderEl({ ...el, id: `preview-${el.id}` } as DrawEl))}
            </Layer>
          </Stage>

          {/* Text input overlay */}
          {textPos && (
            <textarea
              ref={textareaRef}
              value={textVal}
              onChange={e => setTextVal(e.target.value)}
              onBlur={commitText}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitText(); }
                if (e.key === 'Escape') { setTextPos(null); setTextVal(''); }
              }}
              rows={1}
              placeholder="Type here…"
              className="absolute resize-none border-0 outline-none bg-transparent p-0 m-0 leading-normal"
              style={{
                left: textPos.x, top: textPos.y,
                fontFamily: 'Caveat, cursive', fontSize: 20,
                color, minWidth: 120, minHeight: 28,
                caretColor: color,
                boxShadow: `0 0 0 2px ${color}44`,
                borderRadius: 2,
              }}
            />
          )}

          {/* Canvas hint */}
          {elements.length === 0 && !textPos && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p style={{ fontFamily: 'Caveat, cursive', fontSize: '1.3rem', color: '#9ca3af' }}>
                Pick a tool &amp; start drawing!
              </p>
            </div>
          )}
        </div>

        {/* ── Chat sidebar ── */}
        <div className={`
          flex flex-col bg-white z-30 shrink-0 transition-all duration-300 ease-in-out
          ${chatOpen
            ? 'w-full sm:w-80 absolute inset-0 sm:relative sm:inset-auto border-l border-gray-100'
            : 'w-0 overflow-hidden'}
        `}>
          {chatOpen && <>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-800"
                  style={{ fontFamily: 'Caveat, cursive', fontSize: '1.2rem' }}>Chat</span>
                <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
                  {onlineUsers.length} online
                </span>
              </div>
              <button onClick={() => setChatOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                {Icons.close}
              </button>
            </div>

            {/* Online users list */}
            {onlineUsers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 px-4 py-2 border-b border-gray-50">
                {onlineUsers.map(u => (
                  <span key={u.id}
                    className={`text-sm px-2.5 py-0.5 rounded-full font-medium ${
                      u.id === myUserIdRef.current
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                    style={{ fontFamily: 'Inter, sans-serif' }}>
                    {u.id === myUserIdRef.current ? `${u.username} (you)` : u.username}
                  </span>
                ))}
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3">
              {messages.map(msg => (
                <div key={msg.id} className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'}`}>
                  {!msg.isMe && !msg.system && (
                    <span className="text-xs font-semibold text-gray-600 mb-1 px-1" style={{ fontFamily: 'Inter, sans-serif' }}>
                      {msg.sender}
                    </span>
                  )}
                  <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                    msg.system
                      ? 'bg-transparent text-gray-400 italic text-xs text-center w-full px-0'
                      : msg.isMe
                        ? 'bg-indigo-600 text-white rounded-br-sm'
                        : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}>
                    {msg.text}
                  </div>
                  {!msg.system && (
                    <span className="text-xs text-gray-300 mt-1 px-1">{msg.time}</span>
                  )}
                </div>
              ))}
              <div ref={messagesEnd} />
            </div>

            {/* Input */}
            <form onSubmit={sendMsg}
              className="flex items-center gap-2 px-3 py-3 border-t border-gray-100 shrink-0">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Send a message…"
                className="flex-1 px-3 py-2 text-sm rounded-xl border border-gray-200 outline-none focus:border-indigo-400 transition-colors bg-gray-50"
                style={{ fontFamily: 'Inter, sans-serif' }}
              />
              <button type="submit" disabled={!chatInput.trim()}
                className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl transition-colors shrink-0">
                {Icons.send}
              </button>
            </form>
          </>}
        </div>
      </div>
    </div>
  );
}
