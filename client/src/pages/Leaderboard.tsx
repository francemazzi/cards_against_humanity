import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { leaderboardService } from '../services/api';
import { ArrowLeft, Trophy, Medal } from 'lucide-react';
import type { LeaderboardEntry } from '../types';

export const Leaderboard = () => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    leaderboardService.getLeaderboard()
      .then(setEntries)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-[100dvh] bg-gray-100 p-4 xs:p-6 md:p-8">
      <div className="max-w-2xl mx-auto">
        <header className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/lobby')}
            className="p-2 min-w-touch min-h-touch bg-black text-white rounded hover:bg-gray-800 active:scale-95 flex items-center justify-center"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl xs:text-3xl md:text-4xl font-cah font-bold flex items-center gap-3">
            <Trophy size={28} /> Leaderboard
          </h1>
        </header>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
            <p className="text-gray-600">Loading leaderboard...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <Trophy size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 text-lg font-bold">No games completed yet</p>
            <p className="text-gray-400 mt-2">Play some games to see the leaderboard!</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-x-4 p-4 bg-gray-50 border-b font-bold text-sm text-gray-500">
              <span>#</span>
              <span>Player</span>
              <span className="text-center">Wins</span>
              <span className="text-center">Games</span>
              <span className="text-center">Score</span>
            </div>
            {entries.map((entry, index) => (
              <div
                key={entry.userId}
                className={`grid grid-cols-[auto_1fr_auto_auto_auto] gap-x-4 p-4 items-center border-b last:border-b-0 ${
                  index < 3 ? 'bg-yellow-50/50' : ''
                }`}
              >
                <span className="font-bold text-lg w-8 text-center">
                  {index === 0 ? <Medal size={20} className="text-yellow-500 mx-auto" /> :
                   index === 1 ? <Medal size={20} className="text-gray-400 mx-auto" /> :
                   index === 2 ? <Medal size={20} className="text-amber-700 mx-auto" /> :
                   index + 1}
                </span>
                <div>
                  <span className="font-bold">{entry.nickname || entry.username}</span>
                  {entry.nickname && (
                    <span className="text-gray-400 text-sm ml-2">@{entry.username}</span>
                  )}
                </div>
                <span className="font-bold text-center min-w-[3rem]">{entry.gamesWon}</span>
                <span className="text-gray-500 text-center min-w-[3rem]">{entry.gamesPlayed}</span>
                <span className="text-gray-500 text-center min-w-[3rem]">{entry.totalScore}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
