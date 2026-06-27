import React from 'react';
import HomePage from './pages/HomePage';
import RoomPage from './pages/RoomPage';
import './App.css';

type Page = { name: 'home' } | { name: 'room'; roomId: string; username: string };

export default function App() {
  const [page, setPage] = React.useState<Page>({ name: 'home' });

  if (page.name === 'room') {
    return (
      <RoomPage
        roomId={page.roomId}
        username={page.username}
        onLeave={() => setPage({ name: 'home' })}
      />
    );
  }

  return (
    <HomePage
      onCreateRoom={(id, username) => setPage({ name: 'room', roomId: id, username })}
      onJoinRoom={(id, username) => setPage({ name: 'room', roomId: id, username })}
    />
  );
}
