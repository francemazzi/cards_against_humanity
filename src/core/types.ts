// Core types for the game engine
// Maps to Prisma models but used in-memory for game logic

// Card types (self-contained, no external import needed)
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
  systemPrompt: string;
  description?: string;
}

export interface Player {
  id: string;
  name: string;
  isBot: boolean;
  score: number;
  hand: WhiteCard[];
  persona?: Persona;
  userId?: string;
}

export interface PlayedCards {
  playerId: string;
  cards: WhiteCard[];
}

export interface GameSettings {
  maxPlayers: number;
  pointsToWin: number;
}

export interface GameState {
  id: string;
  status: GameStatus;
  round: number;
  ownerId?: string;

  // Decks
  deckBlack: BlackCard[];
  deckWhite: WhiteCard[];

  // Current state
  players: Player[];
  czarIndex: number;
  currentBlackCard: BlackCard | null;
  table: PlayedCards[];

  // Settings
  settings: GameSettings;

  // Winner (only set when status === 'GAME_OVER')
  winnerId?: string;
}

// API Request/Response types
export interface CreateGameRequest {
  humanPlayerName: string;
  personas: string[]; // Persona IDs or names
  pointsToWin?: number;
}

export interface PlayCardsRequest {
  playerId: string;
  cardIds: string[];
}

export interface JudgeRequest {
  winnerIndex: number;
}

export interface GameResponse {
  id: string;
  status: GameStatus;
  round: number;
  players: {
    id: string;
    name: string;
    isBot: boolean;
    score: number;
    handCount: number;
  }[];
  czarId: string;
  currentBlackCard: BlackCard | null;
  table: {
    cards: WhiteCard[];
    playerId?: string; // Only revealed after judging
  }[];
  winnerId?: string;
}

// For human player only - shows their hand
export interface PlayerHandResponse {
  hand: WhiteCard[];
  requiredCards: number;
}

// ============ USER AUTHENTICATION TYPES ============

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  nickname?: string;
  openaiKeyHash?: string;
  openaiKeyLast4?: string;
  openaiKeyEncrypted?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export interface UserPublic {
  id: string;
  username: string;
  nickname?: string;
  hasOpenAIKey: boolean;
  openaiKeyLast4?: string;
  createdAt: Date;
  lastLoginAt?: Date;
}

export interface RegisterRequest {
  username: string;
  password: string;
  nickname?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface UpdateUserRequest {
  nickname?: string;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  nickname?: string;
  gamesPlayed: number;
  gamesWon: number;
  totalScore: number;
}
