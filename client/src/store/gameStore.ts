import { create } from 'zustand';
import type { AuthResponse, GameResponse, WhiteCard, WinnerDisplayData, PlayerHistory, BlackCard, PlayedCards } from '../types';

interface GameState {
  user: AuthResponse['user'] | null;
  isAuthenticated: boolean;
  game: GameResponse | null;
  hand: WhiteCard[];

  // Winner overlay state
  winnerDisplay: WinnerDisplayData | null;

  // Player history state
  roundHistory: PlayerHistory;
  selectedPlayerHistory: string | null;

  // Actions
  setUser: (user: AuthResponse['user']) => void;
  setGame: (game: GameResponse | null) => void;
  setHand: (hand: WhiteCard[]) => void;
  logout: () => void;

  // Winner display actions
  setWinnerDisplay: (data: WinnerDisplayData | null) => void;

  // History actions
  addRoundHistory: (round: number, blackCard: BlackCard, tableEntries: PlayedCards[], winnerId?: string) => void;
  setSelectedPlayerHistory: (playerId: string | null) => void;
  clearRoundHistory: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  user: null,
  isAuthenticated: false,
  game: null,
  hand: [],
  winnerDisplay: null,
  roundHistory: {},
  selectedPlayerHistory: null,

  setUser: (user) => set({ user, isAuthenticated: true }),
  setGame: (game) => set({ game }),
  setHand: (hand) => set({ hand }),
  logout: () => {
    localStorage.removeItem('openai_key');
    set({ user: null, isAuthenticated: false, game: null, hand: [], roundHistory: {}, winnerDisplay: null });
  },

  setWinnerDisplay: (data) => set({ winnerDisplay: data }),

  addRoundHistory: (round, blackCard, tableEntries, winnerId) => set((state) => {
    const newHistory = { ...state.roundHistory };
    tableEntries.forEach(entry => {
      if (!entry.playerId) return;
      if (!newHistory[entry.playerId]) {
        newHistory[entry.playerId] = [];
      }
      // Avoid duplicates for the same round
      const existingEntry = newHistory[entry.playerId].find(e => e.round === round);
      if (!existingEntry) {
        newHistory[entry.playerId].push({
          round,
          blackCard,
          playedCards: entry.cards,
          isWinner: entry.playerId === winnerId
        });
      }
    });
    return { roundHistory: newHistory };
  }),

  setSelectedPlayerHistory: (playerId) => set({ selectedPlayerHistory: playerId }),

  clearRoundHistory: () => set({ roundHistory: {} }),
}));
