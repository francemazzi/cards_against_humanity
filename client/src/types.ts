// Copied from core/types.ts

// Card types
export interface WhiteCard {
  id: string;
  text: string;
  pack: number;
}

export interface BlackCard {
  id: string;
  text: string;
  pick?: number;
  pack: number;
}

export type GameStatus =
  | "LOBBY"
  | "PLAYING_CARDS"
  | "JUDGING"
  | "ROUND_ENDED"
  | "GAME_OVER";

export interface Persona {
  id: string;
  name: string;
  systemPrompt?: string;
  description?: string;
  isCustom?: boolean;
}

export interface Player {
  id: string;
  name: string;
  isBot: boolean;
  score: number;
  handCount?: number; // In GameResponse it is handCount
  hand?: WhiteCard[]; // In full state or for self
  persona?: Persona;
}

export interface PlayedCards {
  playerId?: string;
  cards: WhiteCard[];
}

export interface GameSettings {
  maxPlayers: number;
  pointsToWin: number;
}

export interface GameResponse {
  id: string;
  status: GameStatus;
  round: number;
  players: Player[];
  czarId: string;
  currentBlackCard: BlackCard | null;
  table: PlayedCards[];
  winnerId?: string;
}

// User types
export interface UserPublic {
  id: string;
  openaiKeyLast4: string;
  nickname?: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface AuthResponse {
  user: UserPublic;
  message: string;
  isNewUser: boolean;
}

export interface CreateGameResponse {
  gameId: string;
  humanPlayerId: string;
  message: string;
}

// Winner display data for the winner overlay
export interface WinnerDisplayData {
  winnerId: string;
  winnerName: string;
  roundScore: number;
  blackCard: BlackCard;
  winningCards: WhiteCard[];
  round: number;
}

// Round history entry for player history
export interface RoundHistoryEntry {
  round: number;
  blackCard: BlackCard;
  playedCards: WhiteCard[];
  isWinner: boolean;
}

// Player history map
export interface PlayerHistory {
  [playerId: string]: RoundHistoryEntry[];
}

