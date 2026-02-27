import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { gameService, authService } from "../services/api";
import { useGameStore } from "../store/gameStore";
import { LogOut, Plus, Play, X, User as UserIcon, Settings, Trophy, ExternalLink } from "lucide-react";
import { PlayerSessionStorage } from "../services/PlayerSessionStorage";
import { OpenAIKeyModal } from "../components/OpenAIKeyModal";
import type { Persona } from "../types";

export const Lobby = () => {
  const [joinId, setJoinId] = useState("");
  const user = useGameStore((state) => state.user);
  const setUser = useGameStore((state) => state.setUser);
  const logout = useGameStore((state) => state.logout);
  const navigate = useNavigate();

  const [availablePersonas, setAvailablePersonas] = useState<Persona[]>([]);
  const [selectedPersonaIds, setSelectedPersonaIds] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showOpenAIKeyModal, setShowOpenAIKeyModal] = useState(false);
  const [pointsToWin, setPointsToWin] = useState(5);

  useEffect(() => {
    const loadData = async () => {
      try {
        const me = await authService.getMe();
        setUser(me);
        const personas = await gameService.getPersonas();
        setAvailablePersonas(personas);

        // Pre-select some personas if available, or defaults
        const defaults = ["gordon_ramsay", "mario"];
        const preselected = personas
          .filter((p) => defaults.includes(p.id))
          .map((p) => p.id);

        if (preselected.length > 0) {
          setSelectedPersonaIds(preselected);
        } else if (personas.length >= 2) {
          setSelectedPersonaIds([personas[0].id, personas[1].id]);
        }
      } catch (error: unknown) {
        console.error(error);
        if (
          (error as { response?: { status: number } })?.response?.status === 401
        ) {
          await logout();
          navigate("/");
        }
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateGame = async () => {
    if (selectedPersonaIds.length < 2) {
      alert("Please select at least 2 AI players");
      return;
    }

    try {
      const { gameId, humanPlayerId } = await gameService.create({
        humanPlayerName: user?.nickname || "Player",
        personas: selectedPersonaIds,
        pointsToWin: pointsToWin,
      });
      PlayerSessionStorage.savePlayerId(gameId, humanPlayerId);
      setShowCreateModal(false);
      navigate(`/game/${gameId}`);
    } catch {
      alert("Failed to create game");
    }
  };

  const handleJoinGame = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinId) {
      navigate(`/game/${joinId}`);
    }
  };

  const togglePersona = (id: string) => {
    setSelectedPersonaIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((p) => p !== id);
      }
      if (prev.length >= 7) {
        alert("Max 7 opponents allowed");
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-[100dvh] bg-gray-100 p-4 xs:p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex flex-col xs:flex-row justify-between items-start xs:items-center gap-4 mb-8 md:mb-12">
          <h1 className="text-2xl xs:text-3xl md:text-4xl font-cah font-bold">
            Cards Against Humanity
          </h1>
          <div className="flex items-center gap-3 xs:gap-4">
            <span className="font-bold text-sm xs:text-base truncate max-w-[120px] xs:max-w-none">{user?.nickname || user?.username}</span>
            <button
              onClick={() => navigate("/leaderboard")}
              className="p-2 min-w-touch min-h-touch bg-white text-black border-2 border-black rounded hover:bg-gray-100 active:scale-95 flex items-center justify-center"
              title="Leaderboard"
            >
              <Trophy size={20} />
            </button>
            <button
              onClick={() => setShowOpenAIKeyModal(true)}
              className="p-2 min-w-touch min-h-touch bg-white text-black border-2 border-black rounded hover:bg-gray-100 active:scale-95 flex items-center justify-center"
              title="Settings"
            >
              <Settings size={20} />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 min-w-touch min-h-touch bg-black text-white rounded hover:bg-gray-800 active:scale-95 flex items-center justify-center"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        {/* OpenAI Key Banner */}
        {!user?.hasOpenAIKey && (
          <div className="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-4 xs:p-6 mb-6 md:mb-8">
            <h3 className="font-bold text-yellow-800 mb-1">OpenAI API Key Required</h3>
            <p className="text-yellow-700 text-sm mb-3">
              To play with AI opponents, you need to set your OpenAI API key.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowOpenAIKeyModal(true)}
                className="bg-black text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-800 active:scale-95"
              >
                Set API Key
              </button>
              <a
                href="https://platform.openai.com/settings/organization/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium px-4 py-2"
              >
                <ExternalLink size={16} />
                Get a key from OpenAI
              </a>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
          {/* Create Game */}
          <div className="bg-white p-6 xs:p-8 rounded-xl shadow-lg border-2 border-transparent hover:border-black transition-all">
            <h2 className="text-xl xs:text-2xl font-bold mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 xs:w-6 xs:h-6" /> New Game
            </h2>
            <p className="text-gray-600 mb-6 text-sm xs:text-base">
              Start a new game with AI personalities.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              disabled={!user?.hasOpenAIKey}
              className="w-full bg-black text-white font-bold py-4 min-h-touch rounded-lg text-base xs:text-lg hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {user?.hasOpenAIKey ? 'Setup Game' : 'Set API Key First'}
            </button>
          </div>

          {/* Join Game */}
          <div className="bg-white p-6 xs:p-8 rounded-xl shadow-lg border-2 border-transparent hover:border-black transition-all">
            <h2 className="text-xl xs:text-2xl font-bold mb-4 flex items-center gap-2">
              <Play className="w-5 h-5 xs:w-6 xs:h-6" /> Join Game
            </h2>
            <p className="text-gray-600 mb-6 text-sm xs:text-base">
              Enter a game code to join an existing room.
            </p>
            <form onSubmit={handleJoinGame} className="flex gap-2">
              <input
                type="text"
                value={joinId}
                onChange={(e) => setJoinId(e.target.value)}
                placeholder="Game ID"
                className="flex-1 p-3 xs:p-4 min-h-touch border-2 border-black rounded-lg font-bold text-base"
                required
              />
              <button
                type="submit"
                className="bg-black text-white font-bold px-4 xs:px-6 min-h-touch rounded-lg hover:bg-gray-800 active:scale-95"
              >
                Join
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Create Game Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
              <h3 className="text-2xl font-bold">Setup New Game</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-gray-200 rounded-full"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <div className="mb-8">
                <label className="block font-bold mb-2">Points to Win</label>
                <input
                  type="range"
                  min="3"
                  max="20"
                  value={pointsToWin}
                  onChange={(e) => setPointsToWin(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="text-center mt-2 font-mono text-xl">
                  {pointsToWin} Points
                </div>
              </div>

              <div>
                <div className="flex justify-between items-end mb-4">
                  <label className="block font-bold text-lg">
                    Select Opponents ({selectedPersonaIds.length}/7)
                  </label>
                  <span className="text-sm text-gray-500">
                    Select at least 2
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availablePersonas.map((persona) => (
                    <div
                      key={persona.id}
                      onClick={() => togglePersona(persona.id)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedPersonaIds.includes(persona.id)
                          ? "border-black bg-black text-white"
                          : "border-gray-200 hover:border-gray-400"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="font-bold truncate pr-2">
                          {persona.name}
                        </span>
                        {selectedPersonaIds.includes(persona.id) && (
                          <UserIcon size={16} fill="white" />
                        )}
                      </div>
                      <p
                        className={`text-sm ${
                          selectedPersonaIds.includes(persona.id)
                            ? "text-gray-300"
                            : "text-gray-500"
                        } line-clamp-3`}
                      >
                        {persona.description || persona.systemPrompt}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 xs:p-6 border-t bg-gray-50 rounded-b-xl flex justify-end gap-3 xs:gap-4">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 xs:px-6 py-3 min-h-touch font-bold hover:bg-gray-200 active:scale-95 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGame}
                disabled={selectedPersonaIds.length < 2}
                className="px-6 xs:px-8 py-3 min-h-touch bg-black text-white font-bold rounded-lg hover:bg-gray-800 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start Game
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OpenAI Key Modal */}
      {showOpenAIKeyModal && (
        <OpenAIKeyModal onClose={() => setShowOpenAIKeyModal(false)} />
      )}
    </div>
  );
};
