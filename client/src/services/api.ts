import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import type { AuthResponse, CreateGameResponse, GameResponse, WhiteCard, Persona, UserPublic, LeaderboardEntry } from '../types';

const API_URL = import.meta.env.VITE_API_URL || '';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

export const authService = {
  register: async (username: string, password: string, nickname?: string): Promise<AuthResponse> => {
    const response = await api.post('/api/auth/register', { username, password, nickname });
    return response.data;
  },

  login: async (username: string, password: string): Promise<AuthResponse> => {
    const response = await api.post('/api/auth/login', { username, password });
    return response.data;
  },

  logout: async (): Promise<void> => {
    await api.post('/api/auth/logout');
  },

  getMe: async (): Promise<UserPublic> => {
    const response = await api.get('/api/auth/me');
    return response.data;
  },

  setOpenAIKey: async (apiKey: string): Promise<{ success: boolean; last4: string; message: string }> => {
    const response = await api.put('/api/users/me/openai-key', { apiKey });
    return response.data;
  },

  removeOpenAIKey: async (): Promise<void> => {
    await api.delete('/api/users/me/openai-key');
  },
};

export const gameService = {
  create: async (body: { humanPlayerName: string; personas: string[]; pointsToWin?: number }): Promise<CreateGameResponse> => {
    const response = await api.post('/api/games', body);
    return response.data;
  },

  getPersonas: async (): Promise<Persona[]> => {
    const response = await api.get('/api/personas');
    return response.data;
  },

  start: async (gameId: string) => {
    const response = await api.post(`/api/games/${gameId}/start`);
    return response.data;
  },

  getGame: async (gameId: string): Promise<GameResponse> => {
    const response = await api.get(`/api/games/${gameId}`);
    return response.data;
  },

  getHand: async (gameId: string, playerId: string): Promise<{ hand: WhiteCard[] }> => {
    const response = await api.get(`/api/games/${gameId}/players/${playerId}/hand`);
    return response.data;
  }
};

export const healthService = {
  check: async (): Promise<{ status: string; ollama: string }> => {
    const response = await api.get('/health');
    return response.data;
  },
};

export const leaderboardService = {
  getLeaderboard: async (): Promise<LeaderboardEntry[]> => {
    const response = await api.get('/api/leaderboard');
    return response.data;
  },
};

export let socket: Socket;

export const initSocket = () => {
  socket = io(API_URL || window.location.origin, {
    withCredentials: true,
  });
  return socket;
};
