import { useState, useEffect } from 'react';
import { authService } from '../services/api';
import { useGameStore } from '../store/gameStore';
import { useNavigate } from 'react-router-dom';

export const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const setUser = useGameStore(state => state.setUser);
  const isAuthenticated = useGameStore(state => state.isAuthenticated);
  const navigate = useNavigate();

  // Auto-login: check if session cookie is still valid
  useEffect(() => {
    authService.getMe()
      .then(user => {
        setUser(user);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  // Redirect if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/lobby');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let response;
      if (isRegister) {
        response = await authService.register(username, password, nickname || username);
      } else {
        response = await authService.login(username, password);
      }
      setUser(response.user);
      navigate('/lobby');
    } catch (err: any) {
      const message = err.response?.data?.message || err.response?.data?.error || 'Operation failed';
      setError(message);
      setLoading(false);
    }
  };

  // Show loading spinner during auto-login attempt
  if (loading && !error) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-6 xs:p-8 rounded-lg shadow-xl max-w-md w-full">
        <h1 className="text-2xl xs:text-3xl font-bold font-cah mb-6 text-center">Cards Against Humanity</h1>

        <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
          <button
            type="button"
            onClick={() => { setIsRegister(false); setError(''); }}
            className={`flex-1 py-2 rounded-md font-bold text-sm transition-all ${
              !isRegister ? 'bg-black text-white' : 'text-gray-600 hover:text-black'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => { setIsRegister(true); setError(''); }}
            className={`flex-1 py-2 rounded-md font-bold text-sm transition-all ${
              isRegister ? 'bg-black text-white' : 'text-gray-600 hover:text-black'
            }`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 min-h-touch border-2 border-black rounded text-base focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="Enter your username"
              required
              minLength={3}
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 min-h-touch border-2 border-black rounded text-base focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="Enter your password"
              required
              minLength={4}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
            />
          </div>

          {isRegister && (
            <div>
              <label className="block text-sm font-bold mb-2">Nickname <span className="text-gray-400 font-normal">(optional)</span></label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full p-3 min-h-touch border-2 border-black rounded text-base focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="Display name in game"
                autoComplete="off"
              />
            </div>
          )}

          {error && (
            <div className="text-red-600 text-sm font-bold bg-red-100 p-3 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white font-bold py-3 px-4 min-h-touch rounded text-base hover:bg-gray-800 active:scale-98 transition-all disabled:opacity-50"
          >
            {loading ? 'Connecting...' : isRegister ? 'Create Account' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};
