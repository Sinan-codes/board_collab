import { useState } from 'react';

interface HomePageProps {
  onCreateRoom: (roomId: string) => void;
  onJoinRoom: (roomId: string) => void;
}

function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export default function HomePage({ onCreateRoom, onJoinRoom }: HomePageProps) {
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  function handleCreate() {
    const id = generateRoomId();
    onCreateRoom(id);
  }

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      setJoinError('Please enter a room code.');
      return;
    }
    if (code.length < 4) {
      setJoinError('Room code is too short.');
      return;
    }
    setJoinError('');
    onJoinRoom(code);
  }

  return (
    <div className="min-h-screen w-full bg-white relative overflow-hidden flex flex-col items-center justify-center px-4 py-12">
      {/* Subtle dot-grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          opacity: 0.5,
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-3">
          <svg
            width="44"
            height="44"
            viewBox="0 0 44 44"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="shrink-0"
          >
            <rect width="44" height="44" rx="10" fill="#6965db" />
            <path
              d="M10 32 L20 14 L26 24 L30 18 L36 32"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <circle cx="30" cy="12" r="3.5" fill="white" opacity="0.9" />
          </svg>
          <h1
            className="text-5xl font-bold tracking-tight"
            style={{ fontFamily: 'Caveat, cursive', color: '#1a1a2e' }}
          >
            BoardCollab
          </h1>
        </div>

        {/* Tagline */}
        <p
          className="text-xl text-center mb-10 leading-relaxed"
          style={{ fontFamily: 'Caveat, cursive', color: '#6b7280' }}
        >
          Draw together, think together.
        </p>

        {/* Card */}
        <div className="w-full bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {/* Create Room */}
          <div className="p-6 sm:p-8">
            <p
              className="text-sm font-medium text-gray-400 uppercase tracking-widest mb-4"
              style={{ fontFamily: 'Inter, sans-serif', letterSpacing: '0.12em' }}
            >
              Start a new session
            </p>
            <button
              onClick={handleCreate}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-semibold text-white text-base transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-lg"
              style={{
                fontFamily: 'Caveat, cursive',
                fontSize: '1.25rem',
                background: 'linear-gradient(135deg, #6965db 0%, #8b5cf6 100%)',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 4v12M4 10h12" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Create New Room
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 px-6 sm:px-8">
            <div className="flex-1 h-px bg-gray-100" />
            <span
              className="text-sm text-gray-400"
              style={{ fontFamily: 'Caveat, cursive', fontSize: '1rem' }}
            >
              or join an existing one
            </span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* Join Room */}
          <div className="p-6 sm:p-8">
            <p
              className="text-sm font-medium text-gray-400 uppercase tracking-widest mb-4"
              style={{ fontFamily: 'Inter, sans-serif', letterSpacing: '0.12em' }}
            >
              Join with a code
            </p>
            <form onSubmit={handleJoin} className="flex flex-col gap-3">
              <div className="relative">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => {
                    setJoinCode(e.target.value.toUpperCase());
                    setJoinError('');
                  }}
                  placeholder="e.g. XK92PQ"
                  maxLength={12}
                  className="w-full px-4 py-3.5 rounded-xl border text-base outline-none transition-all duration-150 placeholder:text-gray-300"
                  style={{
                    fontFamily: 'Caveat, cursive',
                    fontSize: '1.2rem',
                    letterSpacing: '0.1em',
                    borderColor: joinError ? '#f87171' : '#e5e7eb',
                    boxShadow: joinError
                      ? '0 0 0 3px rgba(248,113,113,0.15)'
                      : 'none',
                    color: '#1a1a2e',
                  }}
                  onFocus={(e) => {
                    if (!joinError) e.currentTarget.style.borderColor = '#6965db';
                    if (!joinError) e.currentTarget.style.boxShadow = '0 0 0 3px rgba(105,101,219,0.15)';
                  }}
                  onBlur={(e) => {
                    if (!joinError) e.currentTarget.style.borderColor = '#e5e7eb';
                    if (!joinError) e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
              {joinError && (
                <p className="text-sm text-red-400" style={{ fontFamily: 'Caveat, cursive', fontSize: '1rem' }}>
                  {joinError}
                </p>
              )}
              <button
                type="submit"
                className="w-full py-3.5 px-6 rounded-xl font-semibold text-base border-2 transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  fontFamily: 'Caveat, cursive',
                  fontSize: '1.25rem',
                  color: '#6965db',
                  borderColor: '#6965db',
                  background: 'transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#ededfb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                Join Room →
              </button>
            </form>
          </div>
        </div>

        {/* Footer note */}
        <p
          className="mt-8 text-center text-gray-400 text-sm px-4"
          style={{ fontFamily: 'Caveat, cursive', fontSize: '1rem' }}
        >
          No account needed — just share the room code with your teammates
        </p>
      </div>
    </div>
  );
}
