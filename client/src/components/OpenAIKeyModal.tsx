import { useState } from 'react';
import { X, ExternalLink, Key, Trash2 } from 'lucide-react';
import { authService } from '../services/api';
import { useGameStore } from '../store/gameStore';

interface OpenAIKeyModalProps {
  onClose: () => void;
}

export const OpenAIKeyModal = ({ onClose }: OpenAIKeyModalProps) => {
  const user = useGameStore(state => state.user);
  const setUser = useGameStore(state => state.setUser);
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSave = async () => {
    if (!apiKey.trim()) return;
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await authService.setOpenAIKey(apiKey);
      setSuccess(result.message);
      setApiKey('');
      // Update user state
      if (user) {
        setUser({ ...user, hasOpenAIKey: true, openaiKeyLast4: result.last4 });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save API key');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await authService.removeOpenAIKey();
      setSuccess('API key removed');
      if (user) {
        setUser({ ...user, hasOpenAIKey: false, openaiKeyLast4: undefined });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to remove API key');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Key size={20} /> OpenAI API Key
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Current status */}
          <div className={`p-3 rounded-lg text-sm ${user?.hasOpenAIKey ? 'bg-green-50 text-green-800' : 'bg-yellow-50 text-yellow-800'}`}>
            {user?.hasOpenAIKey
              ? `Key set (ending in ...${user.openaiKeyLast4})`
              : 'No API key set - required to play with AI opponents'}
          </div>

          {/* Link to OpenAI */}
          <a
            href="https://platform.openai.com/settings/organization/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            <ExternalLink size={16} />
            Get your API key from OpenAI
          </a>

          {/* Input */}
          <div>
            <label className="block text-sm font-bold mb-2">API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full p-3 border-2 border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
              placeholder="sk-..."
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm font-bold bg-red-100 p-3 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="text-green-600 text-sm font-bold bg-green-100 p-3 rounded">
              {success}
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-gray-50 rounded-b-xl flex justify-between">
          {user?.hasOpenAIKey && (
            <button
              onClick={handleRemove}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-bold text-sm disabled:opacity-50"
            >
              <Trash2 size={16} /> Remove Key
            </button>
          )}
          <div className="flex gap-3 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 font-bold hover:bg-gray-200 rounded-lg"
            >
              Close
            </button>
            <button
              onClick={handleSave}
              disabled={loading || !apiKey.trim()}
              className="px-6 py-2 bg-black text-white font-bold rounded-lg hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Key'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
