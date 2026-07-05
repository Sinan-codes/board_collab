import { useState } from 'react';
import { HTTP_BASE } from '../hooks/useCollabWS';

interface HomePageProps {
  onCreateRoom: (roomId: string, username: string) => void;
  onJoinRoom:   (roomId: string, username: string) => void;
}

const ADJS  = ['Quick','Bold','Sharp','Swift','Bright','Cool','Wild','Calm','Keen','Brave'];
const NOUNS = ['Pencil','Brush','Canvas','Sketch','Ink','Chalk','Paint','Pixel','Stroke','Draft'];

function randomName(): string {
  return ADJS[Math.floor(Math.random() * ADJS.length)] + NOUNS[Math.floor(Math.random() * NOUNS.length)];
}

function getStoredName(): string {
  return sessionStorage.getItem('bc_username') || randomName();
}

function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// ─── Hand-drawn line icon primitive ────────────────────────────────────────

const Sketch = ({ d, size = 22, viewBox = '0 0 24 24' }: { d: string; size?: number; viewBox?: string }) => (
  <svg width={size} height={size} viewBox={viewBox} fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const GLYPHS = {
  pencil:   'M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z',
  chat:     'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z',
  bulb:     'M9 18h6M10 22h4M12 2a7 7 0 00-4 12.7c.6.5 1 1.3 1 2.1v.2h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0012 2z',
  users:    'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M13 3.13a4 4 0 010 7.75M21 21v-2a4 4 0 00-3-3.87M9 11a4 4 0 100-8 4 4 0 000 8z',
  cap:      'M22 10L12 4 2 10l10 6 10-6zM6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5',
  book:     'M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 006.5 22H20V4a2 2 0 00-2-2H6.5A2.5 2.5 0 004 4.5v15z',
  star:     'M12 2l2.2 6.8L21 11l-6.8 2.2L12 20l-2.2-6.8L3 11l6.8-2.2L12 2z',
  squiggle: 'M2 9c2.5-5 5-5 7.5 0s5 5 7.5 0 5-5 7.5 0',
  pin:      'M12 2a5 5 0 00-5 5c0 3.5 5 11 5 11s5-7.5 5-11a5 5 0 00-5-5z',
};

// ─── Decorative floating doodles (purely visual, non-interactive) ─────────

interface DoodleSpec {
  glyph: keyof typeof GLYPHS;
  size: number;
  className: string;   // position + color
  anim: string;         // animation utility class
  style: React.CSSProperties;
}

const DOODLES: DoodleSpec[] = [
  { glyph: 'star',     size: 20, className: 'top-[6%] left-[4%] text-brand/60',          anim: 'doodle-bob',     style: { animationDelay: '0s',   '--rot': '-8deg', '--rot2': '6deg' } as React.CSSProperties },
  { glyph: 'squiggle', size: 36, className: 'top-[3%] right-[6%] text-brand/40',         anim: 'doodle-float-a', style: { animationDelay: '.4s',  animationDuration: '8s' } },
  { glyph: 'pencil',   size: 24, className: 'bottom-[30%] left-[3%] text-gray-300',      anim: 'doodle-float-b', style: { animationDelay: '.8s' } },
  { glyph: 'star',     size: 14, className: 'bottom-[36%] right-[5%] text-brand/50',     anim: 'doodle-wiggle',  style: { animationDelay: '.3s' } },
  { glyph: 'squiggle', size: 28, className: 'bottom-[6%] left-[22%] text-brand/30',      anim: 'doodle-float-b', style: { animationDelay: '.6s',  animationDuration: '9s' } },
];

function FloatingDoodles() {
  return (
    <div className="absolute inset-0 pointer-events-none select-none hidden md:block" aria-hidden="true">
      {DOODLES.map((d, i) => (
        <div key={i} className={`absolute ${d.className} ${d.anim}`} style={d.style}>
          <Sketch d={GLYPHS[d.glyph]} size={d.size} viewBox={d.glyph === 'squiggle' ? '0 0 24 12' : '0 0 24 24'} />
        </div>
      ))}
    </div>
  );
}

// ─── Roaming collaborator cursors — visually *shows* real-time collab ─────

interface CursorSpec { name: string; color: string; base: string; anim: string; delay: string }
const CURSORS: CursorSpec[] = [
  { name: 'Rae',  color: '#3397dc', base: 'top-[46%] left-[44%]', anim: 'cursor-roam-1', delay: '0s' },
  { name: 'Theo', color: '#fb7185', base: 'top-[58%] left-[70%]', anim: 'cursor-roam-2', delay: '1s' },
  { name: 'Mika', color: '#34d399', base: 'top-[64%] left-[85%]', anim: 'cursor-roam-3', delay: '2s' },
];

function RoamingCursors() {
  return (
    <div className="absolute inset-0 pointer-events-none select-none hidden lg:block overflow-hidden" aria-hidden="true">
      {CURSORS.map((c, i) => (
        <div key={i} className={`absolute ${c.base} ${c.anim}`} style={{ animationDelay: c.delay }}>
          <svg width="22" height="22" viewBox="0 0 20 20" fill={c.color} stroke="white" strokeWidth="1">
            <path d="M4 2l13 7-6 1.6L9 17z" strokeLinejoin="round" />
          </svg>
          <span
            className="absolute left-4 top-4 whitespace-nowrap text-[11px] font-semibold text-white px-2 py-0.5 rounded-full shadow-sm"
            style={{ backgroundColor: c.color, fontFamily: 'Inter, sans-serif' }}
          >
            {c.name}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Sticky note wrapper — paper, washi tape, folded corner, rotation ─────

function StickyNote({
  rotate, tapeRotate, children, className = '',
}: { rotate: number; tapeRotate: number; children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative note-settle ${className}`}
      style={{ ['--settle-rot' as any]: `${rotate}deg`, transform: `rotate(${rotate}deg)` }}
    >
      {/* washi tape */}
      <div
        className="absolute -top-3 left-1/2 w-16 h-6 bg-brand/25 border border-white/40 shadow-sm"
        style={{ transform: `translateX(-50%) rotate(${tapeRotate}deg)` }}
      />
      {/* folded corner */}
      <div
        className="absolute top-0 right-0 w-8 h-8 pointer-events-none"
        style={{ background: 'linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.07) 50%)' }}
      />
      <div className="bg-white rounded-lg shadow-[0_10px_25px_-8px_rgba(0,0,0,0.25)] border border-gray-100 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

// ─── Pinned tag used in the "great for" strip ──────────────────────────────

function PinnedTag({ glyph, label, rotate, offsetY, delay }: {
  glyph: keyof typeof GLYPHS; label: string; rotate: number; offsetY: number; delay: string;
}) {
  return (
    <div
      className="relative flex items-center gap-2 bg-white border border-gray-100 rounded-lg pl-3 pr-4 py-2 shadow-md"
      style={{ transform: `rotate(${rotate}deg) translateY(${offsetY}px)` }}
    >
      <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-brand-dark shadow-sm" />
      <span className="text-brand doodle-bob" style={{ animationDelay: delay }}>
        <Sketch d={GLYPHS[glyph]} size={18} />
      </span>
      <span className="text-sm font-medium text-gray-700 whitespace-nowrap" style={{ fontFamily: 'Inter, sans-serif' }}>
        {label}
      </span>
    </div>
  );
}

const USE_CASES: { glyph: keyof typeof GLYPHS; label: string; rotate: number; offsetY: number; delay: string }[] = [
  { glyph: 'users', label: 'Remote teams', rotate: -4, offsetY: 2,   delay: '0s' },
  { glyph: 'cap',   label: 'Classrooms',   rotate: 3,  offsetY: -6,  delay: '.3s' },
  { glyph: 'bulb',  label: 'Brainstorms',  rotate: -2, offsetY: 6,   delay: '.6s' },
  { glyph: 'chat',  label: 'Interviews',   rotate: 4,  offsetY: -3,  delay: '.9s' },
  { glyph: 'book',  label: 'Study groups', rotate: -5, offsetY: 4,   delay: '1.2s' },
];

// ─── HomePage ───────────────────────────────────────────────────────────────

export default function HomePage({ onCreateRoom, onJoinRoom }: HomePageProps) {
  const [username, setUsername] = useState(getStoredName);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [nameError, setNameError] = useState('');
  const [checkingRoom, setCheckingRoom] = useState(false);

  function resolvedName(): string | null {
    const name = username.trim();
    if (!name) { setNameError('Please enter a display name.'); return null; }
    sessionStorage.setItem('bc_username', name);
    return name;
  }

  function handleCreate() {
    const name = resolvedName();
    if (!name) return;
    onCreateRoom(generateRoomId(), name);
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const name = resolvedName();
    if (!name) return;
    const code = joinCode.trim().toUpperCase();
    if (!code) { setJoinError('Please enter a room code.'); return; }
    if (code.length < 4) { setJoinError('Room code is too short.'); return; }
    setJoinError('');
    setCheckingRoom(true);
    try {
      const res = await fetch(`${HTTP_BASE}/rooms/${encodeURIComponent(code)}/exists`);
      // If the endpoint itself is unreachable or unrecognized (e.g. a stale
      // backend deploy), don't block the join on it — let the WebSocket
      // connection be the source of truth, same as before this check existed.
      if (res.ok) {
        const data = await res.json();
        if (data.exists === false) {
          setJoinError(`Room "${code}" doesn't exist. Check the code and try again.`);
          return;
        }
      }
      onJoinRoom(code, name);
    } catch {
      onJoinRoom(code, name);
    } finally {
      setCheckingRoom(false);
    }
  }

  return (
    <div className="relative w-full h-screen overflow-y-auto overflow-x-hidden bg-white">
      {/* Graph-paper canvas background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(#e3f0fa 1px, transparent 1px), linear-gradient(90deg, #e3f0fa 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
      <FloatingDoodles />
      <RoamingCursors />

      {/* Logo sticker, pinned in the corner */}
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20 flex items-center gap-2 -rotate-6 drop-shadow-sm">
        <svg width="32" height="32" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
          <rect width="44" height="44" rx="10" fill="#3397dc" />
          <path d="M10 32 L20 14 L26 24 L30 18 L36 32" stroke="white" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <circle cx="30" cy="12" r="3.5" fill="white" opacity="0.9" />
        </svg>
        <span className="text-base font-extrabold tracking-tight text-[#1a1a2e] hidden sm:inline" style={{ fontFamily: 'Inter, sans-serif' }}>
          BoardCollab
        </span>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-5 sm:px-8 pt-24 sm:pt-28 pb-16">

        {/* ── Hero + notes: asymmetric two-column layout ── */}
        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-y-14 gap-x-10 items-start">

          {/* Left: scrawled headline */}
          <div className="lg:pt-10 lg:pr-6">
            <h1
              className="text-[#1a1a2e] leading-[0.95] -rotate-1"
              style={{ fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: 'clamp(3rem, 8vw, 5.5rem)' }}
            >
              Let's sketch
              <br />
              this out
              <span className="relative inline-block ml-3">
                <span className="relative z-10">— together.</span>
                <span
                  className="absolute left-0 right-0 bottom-1 h-4 sm:h-5 bg-brand/25 -rotate-1 z-0"
                  aria-hidden="true"
                />
              </span>
            </h1>
            <p className="mt-6 max-w-md text-gray-500 text-base sm:text-lg" style={{ fontFamily: 'Inter, sans-serif' }}>
              A shared canvas that updates instantly. No downloads, no sign-ups —
              just open a room and start drawing with anyone, anywhere.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 bg-white border border-gray-100 rounded-full pl-2.5 pr-4 py-1.5 shadow-sm -rotate-1">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="text-sm font-medium text-gray-600" style={{ fontFamily: 'Inter, sans-serif' }}>
                Always free — no account required
              </span>
            </div>
          </div>

          {/* Right: two sticky notes + connecting arrow */}
          <div className="relative">

            {/* connecting hand-drawn arrow (desktop only) */}
            <svg className="hidden lg:block absolute left-[-14px] top-[220px] w-14 h-24 text-brand/60 pointer-events-none z-0"
              viewBox="0 0 60 100" fill="none" aria-hidden="true">
              <path d="M45 4C20 20 8 45 10 70c1 10 8 18 18 22" stroke="currentColor" strokeWidth="2.5"
                strokeLinecap="round" strokeDasharray="1 10" />
              <path d="M20 84l8 10 10-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="hidden lg:block absolute left-[-56px] top-[268px] text-brand/70 -rotate-6 z-0"
              style={{ fontFamily: 'Caveat, cursive', fontSize: '1.1rem' }} aria-hidden="true">
              or...
            </span>

            {/* Note A — Create */}
            <StickyNote rotate={-2.5} tapeRotate={-6} className="w-[min(90vw,23rem)] mx-auto lg:mx-0 lg:ml-auto relative z-10">
              <div className="p-6">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Your display name
                </p>
                <div className="flex gap-2 mb-5">
                  <div className="relative flex-1">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none"
                      width="16" height="16" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                    </svg>
                    <input
                      type="text"
                      value={username}
                      onChange={e => { setUsername(e.target.value); setNameError(''); }}
                      placeholder="Your name"
                      maxLength={24}
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg border text-sm outline-none transition-all duration-150 placeholder:text-gray-300"
                      style={{
                        fontFamily: 'Inter, sans-serif',
                        borderColor: nameError ? '#f87171' : '#e5e7eb',
                        boxShadow: nameError ? '0 0 0 3px rgba(248,113,113,0.15)' : 'none',
                        color: '#1a1a2e',
                      }}
                      onFocus={e => {
                        if (!nameError) {
                          e.currentTarget.style.borderColor = '#3397dc';
                          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(51,151,220,0.15)';
                        }
                      }}
                      onBlur={e => {
                        if (!nameError) {
                          e.currentTarget.style.borderColor = '#e5e7eb';
                          e.currentTarget.style.boxShadow = 'none';
                        }
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => { setUsername(randomName()); setNameError(''); }}
                    title="Random name"
                    className="shrink-0 px-2.5 rounded-lg border border-gray-200 text-gray-400 hover:text-brand hover:border-brand/40 hover:bg-brand-light transition-all duration-150"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 1l4 4-4 4" />
                      <path d="M3 11V9a4 4 0 014-4h14" />
                      <path d="M7 23l-4-4 4-4" />
                      <path d="M21 13v2a4 4 0 01-4 4H3" />
                    </svg>
                  </button>
                </div>
                {nameError && (
                  <p className="-mt-3 mb-4 text-sm text-red-400" style={{ fontFamily: 'Caveat, cursive', fontSize: '1rem' }}>
                    {nameError}
                  </p>
                )}

                <button
                  onClick={handleCreate}
                  className="relative w-full flex items-center justify-center gap-2 py-3 px-6 rounded-lg font-semibold text-white text-base transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0"
                  style={{
                    fontFamily: 'Caveat, cursive',
                    fontSize: '1.3rem',
                    background: 'linear-gradient(135deg, #3397dc 0%, #016ec2 100%)',
                    boxShadow: '3px 3px 0 rgba(1,110,194,0.25)',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 4v12M4 10h12" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Start a new session
                </button>

                <div className="hidden md:block absolute -right-8 -top-6 text-brand/70 doodle-wiggle" aria-hidden="true">
                  <span className="block text-center -mb-1" style={{ fontFamily: 'Caveat, cursive', fontSize: '0.95rem' }}>try it!</span>
                  <svg width="30" height="30" viewBox="0 0 20 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 4c-2.5 8 1.5 15.5 11 13.5M12 21l4-3.7-5.8-1.5" />
                  </svg>
                </div>
              </div>
            </StickyNote>

            {/* Note B — Join */}
            <StickyNote rotate={2} tapeRotate={4} className="w-[min(90vw,21rem)] mx-auto lg:mx-0 mt-8 lg:-mt-6 lg:ml-4 relative z-10">
              <div className="p-6">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Have a room code?
                </p>
                <form onSubmit={handleJoin} className="flex flex-col gap-3">
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setJoinError(''); }}
                    placeholder="e.g. XK92PQ"
                    maxLength={12}
                    className="w-full px-4 py-3 rounded-lg border text-base outline-none transition-all duration-150 placeholder:text-gray-300"
                    style={{
                      fontFamily: 'Caveat, cursive',
                      fontSize: '1.15rem',
                      letterSpacing: '0.1em',
                      borderColor: joinError ? '#f87171' : '#e5e7eb',
                      boxShadow: joinError ? '0 0 0 3px rgba(248,113,113,0.15)' : 'none',
                      color: '#1a1a2e',
                    }}
                    onFocus={(e) => {
                      if (!joinError) e.currentTarget.style.borderColor = '#3397dc';
                      if (!joinError) e.currentTarget.style.boxShadow = '0 0 0 3px rgba(51,151,220,0.15)';
                    }}
                    onBlur={(e) => {
                      if (!joinError) e.currentTarget.style.borderColor = '#e5e7eb';
                      if (!joinError) e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                  {joinError && (
                    <p className="text-sm text-red-400" style={{ fontFamily: 'Caveat, cursive', fontSize: '1rem' }}>
                      {joinError}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={checkingRoom}
                    className="w-full py-3 px-6 rounded-lg font-semibold text-base border-2 transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-wait disabled:hover:translate-y-0"
                    style={{ fontFamily: 'Caveat, cursive', fontSize: '1.3rem', color: '#3397dc', borderColor: '#3397dc', background: 'transparent' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#e7f3fc'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    {checkingRoom ? 'Checking…' : 'Join Room →'}
                  </button>
                </form>
              </div>
            </StickyNote>
          </div>
        </div>

        {/* ── "Great for" pinned tags ── */}
        <div className="mt-24 sm:mt-28 text-center">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-[0.2em] mb-8" style={{ fontFamily: 'Inter, sans-serif' }}>
            BoardCollab is great for
          </p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-6">
            {USE_CASES.map(u => (
              <PinnedTag key={u.label} glyph={u.glyph} label={u.label} rotate={u.rotate} offsetY={u.offsetY} delay={u.delay} />
            ))}
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-gray-400 mt-16" style={{ fontFamily: 'Caveat, cursive', fontSize: '1.1rem' }}>
          No account needed — just share the room code with your teammates
        </p>
      </div>
    </div>
  );
}
