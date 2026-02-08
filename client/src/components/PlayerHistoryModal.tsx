import type { RoundHistoryEntry } from '../types';
import { Card } from './Card';
import clsx from 'clsx';

interface PlayerHistoryModalProps {
  playerName: string;
  history: RoundHistoryEntry[];
  onClose: () => void;
}

export const PlayerHistoryModal: React.FC<PlayerHistoryModalProps> = ({
  playerName,
  history,
  onClose
}) => {
  // Sort history by round descending (most recent first)
  const sortedHistory = [...history].sort((a, b) => b.round - a.round);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">
            {playerName}'s Plays
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {sortedHistory.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              No plays recorded yet
            </div>
          ) : (
            <div className="space-y-4">
              {sortedHistory.map((entry, index) => (
                <div
                  key={`${entry.round}-${index}`}
                  className={clsx(
                    "bg-gray-800 rounded-lg p-4 border-2",
                    entry.isWinner ? "border-yellow-500" : "border-gray-700"
                  )}
                >
                  {/* Round header */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-gray-400 text-sm font-medium">
                      Round {entry.round}
                    </span>
                    {entry.isWinner && (
                      <span className="bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded">
                        WINNER
                      </span>
                    )}
                  </div>

                  {/* Cards display */}
                  <div className="flex flex-wrap gap-2 items-start">
                    {/* Black card (mini version) */}
                    <div className="bg-black text-white p-3 rounded-lg text-sm max-w-[180px] flex-shrink-0">
                      <div className="line-clamp-3 font-bold">
                        {entry.blackCard.text}
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="text-gray-500 self-center px-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </div>

                    {/* White cards played */}
                    <div className="flex gap-2 flex-wrap">
                      {entry.playedCards.map(card => (
                        <Card
                          key={card.id}
                          card={card}
                          size="sm"
                          className={clsx(
                            entry.isWinner && "ring-2 ring-yellow-400"
                          )}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700">
          <div className="text-center text-gray-400 text-sm">
            {sortedHistory.filter(h => h.isWinner).length} wins out of {sortedHistory.length} rounds
          </div>
        </div>
      </div>
    </div>
  );
};
