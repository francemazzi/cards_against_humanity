import { useEffect, useState } from 'react';
import type { WinnerDisplayData } from '../types';
import { Card } from './Card';
import clsx from 'clsx';

interface WinnerOverlayProps {
  data: WinnerDisplayData;
  onClose: () => void;
  isMe: boolean;
}

export const WinnerOverlay: React.FC<WinnerOverlayProps> = ({ data, onClose, isMe }) => {
  const [timeLeft, setTimeLeft] = useState(15);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onClose]);

  // Build the filled text for the black card
  const filledBlackCardText = () => {
    let text = data.blackCard.text;
    const pick = data.blackCard.pick || 1;

    // Replace blanks with winning cards
    for (let i = 0; i < pick && i < data.winningCards.length; i++) {
      const answer = data.winningCards[i].text.replace(/\.$/, ''); // Remove trailing period
      // Replace first blank or append
      if (text.includes('____')) {
        text = text.replace('____', `**${answer}**`);
      } else if (text.includes('_')) {
        text = text.replace(/_+/, `**${answer}**`);
      } else {
        // No blank found, append
        text = `${text} **${answer}**`;
      }
    }
    return text;
  };

  // Render text with highlighted answers
  const renderFilledText = () => {
    const text = filledBlackCardText();
    const parts = text.split(/\*\*(.+?)\*\*/g);

    return parts.map((part, i) => {
      // Odd indices are the captured groups (answers)
      if (i % 2 === 1) {
        return (
          <span key={i} className="text-yellow-400 underline decoration-2 underline-offset-4">
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="max-w-lg w-full animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Winner badge */}
        <div className={clsx(
          "text-center mb-6",
          isMe ? "animate-bounce" : ""
        )}>
          <div className="inline-block bg-yellow-500 text-black px-6 py-3 rounded-full font-bold text-xl md:text-2xl shadow-lg animate-winner-glow">
            {isMe ? "You Won!" : `${data.winnerName} Wins!`}
          </div>
          <div className="text-yellow-400 font-bold text-lg mt-2">
            +{data.roundScore} point{data.roundScore !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Black card with filled answer */}
        <div className="bg-black text-white rounded-xl p-6 md:p-8 shadow-2xl animate-winner-glow mb-6">
          <div className="text-xl md:text-2xl font-bold leading-relaxed">
            {renderFilledText()}
          </div>
          <div className="mt-4 text-xs uppercase tracking-wider opacity-60">
            Round {data.round}
          </div>
        </div>

        {/* Winning cards display */}
        <div className="flex justify-center gap-2 mb-6">
          {data.winningCards.map(card => (
            <Card
              key={card.id}
              card={card}
              size="sm"
              className="ring-2 ring-yellow-400"
            />
          ))}
        </div>

        {/* Continue button and timer */}
        <div className="text-center">
          <button
            onClick={onClose}
            className="bg-white text-black px-8 py-3 rounded-full font-bold text-lg hover:bg-gray-100 active:scale-95 transition-transform"
          >
            Continue
          </button>
          <div className="text-gray-400 text-sm mt-3">
            Auto-continuing in {timeLeft}s
          </div>
        </div>
      </div>
    </div>
  );
};
