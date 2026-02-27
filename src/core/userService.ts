// User Service - manages user authentication and CRUD operations
// Users authenticate via username/password, OpenAI key is optional

import { createHash, createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import prisma from "../db/prisma.js";
import type { User, UserPublic, UpdateUserRequest, LeaderboardEntry } from "./types.js";

const SALT_ROUNDS = 10;

function getEncryptionKey(): Buffer {
  const secret = process.env.SESSION_SECRET || "default-dev-secret-change-in-prod!!";
  // Derive a 32-byte key from the secret using SHA-256
  return createHash("sha256").update(secret).digest();
}

// ============ PASSWORD FUNCTIONS ============

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ============ OPENAI KEY ENCRYPTION ============

export function encryptApiKey(apiKey: string): string {
  const iv = randomBytes(16);
  const key = getEncryptionKey();
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  let encrypted = cipher.update(apiKey, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

export function decryptApiKey(encryptedData: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedData.split(":");
  const key = getEncryptionKey();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// ============ UTILITY FUNCTIONS ============

export function hashApiKey(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex");
}

export function getApiKeyLast4(apiKey: string): string {
  return apiKey.slice(-4);
}

function dbUserToUser(dbUser: {
  id: string;
  username: string;
  passwordHash: string;
  nickname: string | null;
  openaiKeyHash: string | null;
  openaiKeyLast4: string | null;
  openaiKeyEncrypted: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
}): User {
  return {
    id: dbUser.id,
    username: dbUser.username,
    passwordHash: dbUser.passwordHash,
    nickname: dbUser.nickname ?? undefined,
    openaiKeyHash: dbUser.openaiKeyHash ?? undefined,
    openaiKeyLast4: dbUser.openaiKeyLast4 ?? undefined,
    openaiKeyEncrypted: dbUser.openaiKeyEncrypted ?? undefined,
    createdAt: dbUser.createdAt,
    updatedAt: dbUser.updatedAt,
    lastLoginAt: dbUser.lastLoginAt ?? undefined,
  };
}

export function userToPublic(user: User): UserPublic {
  return {
    id: user.id,
    username: user.username,
    nickname: user.nickname,
    hasOpenAIKey: !!user.openaiKeyHash,
    openaiKeyLast4: user.openaiKeyLast4,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
  };
}

// ============ AUTH OPERATIONS ============

export async function registerUser(
  username: string,
  password: string,
  nickname?: string
): Promise<User> {
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    throw new Error("Username already taken");
  }

  const passwordHash = await hashPassword(password);
  const newUser = await prisma.user.create({
    data: {
      id: uuidv4(),
      username,
      passwordHash,
      nickname: nickname || username,
      lastLoginAt: new Date(),
    },
  });

  return dbUserToUser(newUser);
}

export async function loginUser(username: string, password: string): Promise<User> {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    throw new Error("Invalid username or password");
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    throw new Error("Invalid username or password");
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return dbUserToUser(updated);
}

// ============ OPENAI KEY MANAGEMENT ============

export async function setUserOpenAIKey(userId: string, apiKey: string): Promise<{ last4: string }> {
  const keyHash = hashApiKey(apiKey);
  const keyLast4 = getApiKeyLast4(apiKey);
  const encrypted = encryptApiKey(apiKey);

  await prisma.user.update({
    where: { id: userId },
    data: {
      openaiKeyHash: keyHash,
      openaiKeyLast4: keyLast4,
      openaiKeyEncrypted: encrypted,
    },
  });

  return { last4: keyLast4 };
}

export async function getUserOpenAIKey(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { openaiKeyEncrypted: true },
  });
  if (!user?.openaiKeyEncrypted) return null;
  return decryptApiKey(user.openaiKeyEncrypted);
}

export async function removeUserOpenAIKey(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      openaiKeyHash: null,
      openaiKeyLast4: null,
      openaiKeyEncrypted: null,
    },
  });
}

// ============ CRUD OPERATIONS ============

export async function findUserById(id: string): Promise<User | null> {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return null;
  return dbUserToUser(user);
}

export async function findUserByApiKey(apiKey: string): Promise<User | null> {
  const keyHash = hashApiKey(apiKey);
  const user = await prisma.user.findUnique({
    where: { openaiKeyHash: keyHash },
  });
  if (!user) return null;
  return dbUserToUser(user);
}

export async function updateUser(
  id: string,
  data: UpdateUserRequest
): Promise<User> {
  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(data.nickname !== undefined && { nickname: data.nickname || null }),
    },
  });
  return dbUserToUser(user);
}

export async function deleteUser(id: string): Promise<void> {
  await prisma.user.delete({ where: { id } });
}

// ============ GAME STATS ============

export async function getUserGames(userId: string): Promise<{ id: string; status: string; createdAt: Date }[]> {
  return prisma.game.findMany({
    where: { ownerId: userId },
    select: { id: true, status: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getUserStats(userId: string): Promise<{
  totalGames: number;
  gamesWon: number;
  totalRoundsPlayed: number;
}> {
  const totalGames = await prisma.game.count({
    where: { ownerId: userId },
  });

  const gamesWon = await prisma.game.count({
    where: {
      status: "GAME_OVER",
      players: {
        some: {
          userId: userId,
          isBot: false,
        },
      },
      winnerId: { not: null },
    },
  });

  const roundsPlayed = await prisma.playedCard.count({
    where: {
      player: { userId: userId },
    },
  });

  return { totalGames, gamesWon, totalRoundsPlayed: roundsPlayed };
}

// ============ LEADERBOARD ============

export async function getLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
  const users = await prisma.user.findMany({
    where: {
      username: { not: "_system" },
    },
    select: {
      id: true,
      username: true,
      nickname: true,
      players: {
        where: {
          isBot: false,
          game: { status: "GAME_OVER" },
        },
        select: {
          id: true,
          score: true,
          game: {
            select: {
              winnerId: true,
            },
          },
        },
      },
    },
  });

  const entries: LeaderboardEntry[] = users
    .map((u: typeof users[number]) => {
      const gamesPlayed = u.players.length;
      const gamesWon = u.players.filter((p: typeof u.players[number]) => p.game.winnerId === p.id).length;
      const totalScore = u.players.reduce((sum: number, p: typeof u.players[number]) => sum + p.score, 0);

      return {
        userId: u.id,
        username: u.username,
        nickname: u.nickname ?? undefined,
        gamesPlayed,
        gamesWon,
        totalScore,
      };
    })
    .filter((e: LeaderboardEntry) => e.gamesPlayed > 0)
    .sort((a: LeaderboardEntry, b: LeaderboardEntry) => b.gamesWon - a.gamesWon || b.totalScore - a.totalScore)
    .slice(0, limit);

  return entries;
}
