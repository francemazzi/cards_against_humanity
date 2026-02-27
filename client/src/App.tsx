import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { Lobby } from './pages/Lobby';
import { GameRoom } from './pages/GameRoom';
import { Leaderboard } from './pages/Leaderboard';
import { useGameStore } from './store/gameStore';

function App() {
  const isAuthenticated = useGameStore(state => state.isAuthenticated);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route
          path="/lobby"
          element={isAuthenticated ? <Lobby /> : <Navigate to="/" />}
        />
        <Route
          path="/game/:gameId"
          element={isAuthenticated ? <GameRoom /> : <Navigate to="/" />}
        />
        <Route
          path="/leaderboard"
          element={isAuthenticated ? <Leaderboard /> : <Navigate to="/" />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
