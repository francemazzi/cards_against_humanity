// Socket.IO Manager for real-time game rooms
import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import type { GameResponse } from "../core/types.js";

// Socket events
export const SOCKET_EVENTS = {
  // Client -> Server
  JOIN_GAME: "join_game",
  LEAVE_GAME: "leave_game",
  PLAY_CARDS: "play_cards",
  JUDGE_WINNER: "judge_winner",
  START_GAME: "start_game",
  NEXT_ROUND: "next_round",
  
  // Server -> Client
  GAME_STATE: "game_state",
  PLAYER_JOINED: "player_joined",
  PLAYER_LEFT: "player_left",
  CARDS_PLAYED: "cards_played",
  ROUND_STARTED: "round_started",
  JUDGING_STARTED: "judging_started",
  WINNER_SELECTED: "winner_selected",
  GAME_OVER: "game_over",
  ERROR: "error",
} as const;

// Client socket data
interface SocketData {
  gameId?: string;
  playerId?: string;
}

// Singleton instance
let io: Server | null = null;

/**
 * Initialize Socket.IO server
 */
export function initSocketServer(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: true,
      credentials: true,
      methods: ["GET", "POST"],
    },
    path: "/socket.io",
  });

  io.on("connection", handleConnection);

  console.log("Socket.IO server initialized");
  return io;
}

/**
 * Get the Socket.IO server instance
 */
export function getIO(): Server {
  if (!io) {
    throw new Error("Socket.IO not initialized. Call initSocketServer first.");
  }
  return io;
}

/**
 * Handle new socket connection
 */
function handleConnection(socket: Socket): void {
  console.log(`Socket connected: ${socket.id}`);

  const socketData: SocketData = {};

  // Join a game room
  socket.on(SOCKET_EVENTS.JOIN_GAME, async (data: { gameId: string; playerId: string }) => {
    try {
      const { gameId, playerId } = data;

      // Store data on socket
      socketData.gameId = gameId;
      socketData.playerId = playerId;
      
      // Join the game room
      await socket.join(`game:${gameId}`);
      
      console.log(`Socket ${socket.id} joined game ${gameId} as player ${playerId}`);
      
      // Notify room
      socket.to(`game:${gameId}`).emit(SOCKET_EVENTS.PLAYER_JOINED, { playerId });
      
    } catch (error) {
      emitError(socket, error);
    }
  });

  // Leave game room
  socket.on(SOCKET_EVENTS.LEAVE_GAME, async () => {
    if (socketData.gameId) {
      await socket.leave(`game:${socketData.gameId}`);
      socket.to(`game:${socketData.gameId}`).emit(SOCKET_EVENTS.PLAYER_LEFT, { 
        playerId: socketData.playerId 
      });
      console.log(`Socket ${socket.id} left game ${socketData.gameId}`);
    }
  });

  // Play cards
  socket.on(SOCKET_EVENTS.PLAY_CARDS, async (data: { gameId: string; playerId: string; cardIds: string[] }) => {
    try {
      const { gameId, playerId, cardIds } = data;

      console.log(`Player ${playerId} playing cards in game ${gameId}:`, cardIds);

      // Import gameService dynamically to avoid circular dependencies
      const gameService = await import("../core/gameService.js");
      await gameService.playHumanCards(gameId, playerId, cardIds, undefined);
      
      // Broadcast updated game state
      const gameResponse = gameService.getGameResponse(gameId);
      broadcastGameState(gameId, gameResponse);
      
      // Notify that cards were played
      broadcastCardsPlayed(gameId, { playerId, cardsCount: cardIds.length });
      
    } catch (error) {
      console.error("Error playing cards:", error);
      emitError(socket, error);
    }
  });

  // Judge winner
  socket.on(SOCKET_EVENTS.JUDGE_WINNER, async (data: { gameId: string; playerId: string; winnerIndex: number }) => {
    try {
      const { gameId, winnerIndex } = data;

      console.log(`Judging winner in game ${gameId}: index ${winnerIndex}`);

      // Import gameService dynamically to avoid circular dependencies
      const gameService = await import("../core/gameService.js");
      await gameService.humanJudge(gameId, winnerIndex, undefined);
      
      // Broadcast updated game state
      const gameResponse = gameService.getGameResponse(gameId);
      broadcastGameState(gameId, gameResponse);
      
    } catch (error) {
      console.error("Error judging winner:", error);
      emitError(socket, error);
    }
  });

  // Start game
  socket.on(SOCKET_EVENTS.START_GAME, async (data: { gameId: string }) => {
    try {
      const { gameId } = data;

      console.log(`Starting game ${gameId}`);

      // Import gameService dynamically to avoid circular dependencies
      const gameService = await import("../core/gameService.js");
      await gameService.startGame(gameId, undefined);
      
      // Broadcast updated game state
      const gameResponse = gameService.getGameResponse(gameId);
      broadcastRoundStarted(gameId, gameResponse);
      
    } catch (error) {
      console.error("Error starting game:", error);
      emitError(socket, error);
    }
  });

  // Next round
  socket.on(SOCKET_EVENTS.NEXT_ROUND, async (data: { gameId: string }) => {
    try {
      const { gameId } = data;

      console.log(`Starting next round in game ${gameId}`);

      // Import gameService dynamically to avoid circular dependencies
      const gameService = await import("../core/gameService.js");
      await gameService.nextRound(gameId, undefined);
      
      // Broadcast updated game state
      const gameResponse = gameService.getGameResponse(gameId);
      broadcastRoundStarted(gameId, gameResponse);
      
    } catch (error) {
      console.error("Error starting next round:", error);
      emitError(socket, error);
    }
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);
    if (socketData.gameId) {
      socket.to(`game:${socketData.gameId}`).emit(SOCKET_EVENTS.PLAYER_LEFT, { 
        playerId: socketData.playerId 
      });
    }
  });
}

// --- Broadcast Functions (called from gameService) ---

/**
 * Broadcast game state to all players in a room
 */
export function broadcastGameState(gameId: string, gameState: GameResponse): void {
  if (!io) return;
  io.to(`game:${gameId}`).emit(SOCKET_EVENTS.GAME_STATE, gameState);
}

/**
 * Broadcast that a new round has started
 */
export function broadcastRoundStarted(gameId: string, gameState: GameResponse): void {
  if (!io) return;
  io.to(`game:${gameId}`).emit(SOCKET_EVENTS.ROUND_STARTED, gameState);
}

/**
 * Broadcast that cards were played
 */
export function broadcastCardsPlayed(gameId: string, data: { playerId: string; cardsCount: number }): void {
  if (!io) return;
  io.to(`game:${gameId}`).emit(SOCKET_EVENTS.CARDS_PLAYED, data);
}

/**
 * Broadcast that judging phase started
 */
export function broadcastJudgingStarted(gameId: string, gameState: GameResponse): void {
  if (!io) return;
  io.to(`game:${gameId}`).emit(SOCKET_EVENTS.JUDGING_STARTED, gameState);
}

/**
 * Broadcast winner selection
 */
export function broadcastWinnerSelected(gameId: string, data: { winnerId: string; winnerName: string; roundScore: number }): void {
  if (!io) return;
  io.to(`game:${gameId}`).emit(SOCKET_EVENTS.WINNER_SELECTED, data);
}

/**
 * Broadcast game over
 */
export function broadcastGameOver(gameId: string, data: { winnerId: string; winnerName: string; finalScores: { playerId: string; name: string; score: number }[] }): void {
  if (!io) return;
  io.to(`game:${gameId}`).emit(SOCKET_EVENTS.GAME_OVER, data);
}

/**
 * Send error to specific socket
 */
function emitError(socket: Socket, error: unknown): void {
  const message = error instanceof Error ? error.message : "Unknown error";
  socket.emit(SOCKET_EVENTS.ERROR, { message });
}

/**
 * Send error to all sockets in a room
 */
export function broadcastError(gameId: string, message: string): void {
  if (!io) return;
  io.to(`game:${gameId}`).emit(SOCKET_EVENTS.ERROR, { message });
}



