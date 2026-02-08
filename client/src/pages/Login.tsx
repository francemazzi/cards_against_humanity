import { useState, useEffect } from 'react';
import { authService } from '../services/api';
import { useGameStore } from '../store/gameStore';
import { useNavigate } from 'react-router-dom';

// Session expires after 24 hours (in milliseconds)
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000;

const clearStoredCredentials = () => {
  localStorage.removeItem('openai_key');
  localStorage.removeItem('nickname');
  localStorage.removeItem('session_timestamp');
};

const isSessionExpired = (): boolean => {
  const timestamp = localStorage.getItem('session_timestamp');
  if (!timestamp) return true;

  const sessionTime = parseInt(timestamp, 10);
  const now = Date.now();

  return now - sessionTime > SESSION_EXPIRY_MS;
};

export const Login = () => {
  const [apiKey, setApiKey] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const setUser = useGameStore(state => state.setUser);
  const isAuthenticated = useGameStore(state => state.isAuthenticated);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if session is expired
    if (isSessionExpired()) {
      clearStoredCredentials();
      setLoading(false);
      return;
    }

    // Check if credentials exist in local storage
    const storedKey = localStorage.getItem('openai_key');
    const storedNickname = localStorage.getItem('nickname');

    if (storedKey) {
      setApiKey(storedKey);
    }
    if (storedNickname) {
      setNickname(storedNickname);
    }

    // Auto-login if we have both stored and not expired
    if (storedKey && storedNickname) {
      autoLogin(storedKey, storedNickname);
    } else {
      setLoading(false);
    }
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/lobby');
    }
  }, [isAuthenticated, navigate]);

  const autoLogin = async (key: string, name: string) => {
    try {
      const response = await authService.register(key, name);
      // Refresh session timestamp on successful auto-login
      localStorage.setItem('session_timestamp', Date.now().toString());
      setUser(response.user);
      navigate('/lobby');
    } catch {
      // Auto-login failed, clear credentials and show form
      clearStoredCredentials();
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authService.register(apiKey, nickname || 'Player');

      // Save credentials with timestamp
      localStorage.setItem('openai_key', apiKey);
      localStorage.setItem('nickname', nickname || 'Player');
      localStorage.setItem('session_timestamp', Date.now().toString());

      setUser(response.user);
      navigate('/lobby');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to login');
      setLoading(false);
    }
  };

  // Show loading spinner during auto-login attempt
  if (loading && localStorage.getItem('openai_key') && localStorage.getItem('nickname')) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Logging in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-6 xs:p-8 rounded-lg shadow-xl max-w-md w-full">
        <h1 className="text-2xl xs:text-3xl font-bold font-cah mb-6 text-center">Cards Against Humanity</h1>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-2">Nickname</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full p-3 min-h-touch border-2 border-black rounded text-base focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="Enter your name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">OpenAI API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full p-3 min-h-touch border-2 border-black rounded text-base focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="sk-..."
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Stored locally for 24h. Used for AI players.
            </p>
          </div>

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
            {loading ? 'Connecting...' : 'Enter Game'}
          </button>
        </form>
      </div>
    </div>
  );
};
