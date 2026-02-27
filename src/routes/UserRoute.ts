// User API Routes
// Authentication with username/password and cookie sessions

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import * as userService from "../core/userService.js";
import * as llm from "../ai/llm.js";
import {
  authenticationHook,
  setSessionCookie,
  clearSessionCookie,
} from "../middleware/authMiddleware.js";

export async function registerUserRoute(fastify: FastifyInstance): Promise<void> {
  // ============ AUTH ENDPOINTS ============

  /**
   * POST /api/auth/register
   * Register with username + password
   */
  fastify.post(
    "/api/auth/register",
    {
      schema: {
        description: "Register a new account with username and password",
        tags: ["Auth"],
        body: {
          type: "object",
          required: ["username", "password"],
          properties: {
            username: { type: "string", minLength: 3, maxLength: 30 },
            password: { type: "string", minLength: 4, maxLength: 100 },
            nickname: { type: "string", minLength: 1, maxLength: 50 },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              user: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  username: { type: "string" },
                  nickname: { type: "string" },
                  hasOpenAIKey: { type: "boolean" },
                  openaiKeyLast4: { type: "string" },
                  createdAt: { type: "string" },
                  lastLoginAt: { type: "string" },
                },
              },
              message: { type: "string" },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: { username: string; password: string; nickname?: string } }>,
      reply: FastifyReply
    ) => {
      const { username, password, nickname } = request.body;

      try {
        const user = await userService.registerUser(username, password, nickname);
        setSessionCookie(reply, user.id);

        return reply.send({
          user: userService.userToPublic(user),
          message: "Registration successful",
        });
      } catch (error: any) {
        if (error.message === "Username already taken") {
          return reply.status(409).send({
            error: "Username already taken",
            message: "Please choose a different username",
          });
        }
        throw error;
      }
    }
  );

  /**
   * POST /api/auth/login
   * Login with username + password
   */
  fastify.post(
    "/api/auth/login",
    {
      schema: {
        description: "Login with username and password",
        tags: ["Auth"],
        body: {
          type: "object",
          required: ["username", "password"],
          properties: {
            username: { type: "string" },
            password: { type: "string" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              user: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  username: { type: "string" },
                  nickname: { type: "string" },
                  hasOpenAIKey: { type: "boolean" },
                  openaiKeyLast4: { type: "string" },
                  createdAt: { type: "string" },
                  lastLoginAt: { type: "string" },
                },
              },
              message: { type: "string" },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: { username: string; password: string } }>,
      reply: FastifyReply
    ) => {
      const { username, password } = request.body;

      try {
        const user = await userService.loginUser(username, password);
        setSessionCookie(reply, user.id);

        return reply.send({
          user: userService.userToPublic(user),
          message: "Login successful",
        });
      } catch (error: any) {
        return reply.status(401).send({
          error: "Invalid credentials",
          message: "Invalid username or password",
        });
      }
    }
  );

  /**
   * POST /api/auth/logout
   * Destroy session cookie
   */
  fastify.post(
    "/api/auth/logout",
    {
      schema: {
        description: "Logout and destroy session",
        tags: ["Auth"],
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
            },
          },
        },
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      clearSessionCookie(reply);
      return reply.send({ message: "Logged out successfully" });
    }
  );

  /**
   * GET /api/auth/me
   * Get current authenticated user
   */
  fastify.get(
    "/api/auth/me",
    {
      preHandler: authenticationHook,
      schema: {
        description: "Get current authenticated user profile",
        tags: ["Auth"],
        response: {
          200: {
            type: "object",
            properties: {
              id: { type: "string" },
              username: { type: "string" },
              nickname: { type: "string" },
              hasOpenAIKey: { type: "boolean" },
              openaiKeyLast4: { type: "string" },
              createdAt: { type: "string" },
              lastLoginAt: { type: "string" },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      return reply.send(userService.userToPublic(request.user!));
    }
  );

  // ============ OPENAI KEY MANAGEMENT ============

  /**
   * PUT /api/users/me/openai-key
   * Set/update OpenAI API key
   */
  fastify.put<{ Body: { apiKey: string } }>(
    "/api/users/me/openai-key",
    {
      preHandler: authenticationHook,
      schema: {
        description: "Set or update your OpenAI API key",
        tags: ["Users"],
        body: {
          type: "object",
          required: ["apiKey"],
          properties: {
            apiKey: { type: "string", minLength: 1 },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              last4: { type: "string" },
              message: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { apiKey } = request.body;

      // Validate the key with OpenAI
      const isValid = await llm.validateApiKey(apiKey);
      if (!isValid) {
        return reply.status(400).send({
          error: "Invalid API key",
          message: "The provided OpenAI API key is invalid or expired",
        });
      }

      const { last4 } = await userService.setUserOpenAIKey(request.user!.id, apiKey);

      return reply.send({
        success: true,
        last4,
        message: "OpenAI API key saved successfully",
      });
    }
  );

  /**
   * DELETE /api/users/me/openai-key
   * Remove OpenAI API key
   */
  fastify.delete(
    "/api/users/me/openai-key",
    {
      preHandler: authenticationHook,
      schema: {
        description: "Remove your OpenAI API key",
        tags: ["Users"],
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      await userService.removeUserOpenAIKey(request.user!.id);
      return reply.send({ message: "OpenAI API key removed" });
    }
  );

  // ============ USER CRUD ENDPOINTS ============

  /**
   * GET /api/users/me
   * Get current authenticated user's profile
   */
  fastify.get(
    "/api/users/me",
    {
      preHandler: authenticationHook,
      schema: {
        description: "Get current authenticated user's profile",
        tags: ["Users"],
        response: {
          200: {
            type: "object",
            properties: {
              id: { type: "string" },
              username: { type: "string" },
              nickname: { type: "string" },
              hasOpenAIKey: { type: "boolean" },
              openaiKeyLast4: { type: "string" },
              createdAt: { type: "string" },
              lastLoginAt: { type: "string" },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      return reply.send(userService.userToPublic(request.user!));
    }
  );

  /**
   * PUT /api/users/me
   * Update current authenticated user's profile
   */
  fastify.put<{ Body: { nickname?: string } }>(
    "/api/users/me",
    {
      preHandler: authenticationHook,
      schema: {
        description: "Update current authenticated user's profile",
        tags: ["Users"],
        body: {
          type: "object",
          properties: {
            nickname: { type: "string", minLength: 1, maxLength: 50 },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              id: { type: "string" },
              username: { type: "string" },
              nickname: { type: "string" },
              hasOpenAIKey: { type: "boolean" },
              openaiKeyLast4: { type: "string" },
              createdAt: { type: "string" },
              lastLoginAt: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const user = request.user!;
      const { nickname } = request.body;
      const updatedUser = await userService.updateUser(user.id, { nickname });
      return reply.send(userService.userToPublic(updatedUser));
    }
  );

  /**
   * DELETE /api/users/me
   * Delete current authenticated user's account
   */
  fastify.delete(
    "/api/users/me",
    {
      preHandler: authenticationHook,
      schema: {
        description: "Delete current authenticated user's account",
        tags: ["Users"],
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      await userService.deleteUser(request.user!.id);
      clearSessionCookie(reply);
      return reply.send({ message: "User deleted successfully" });
    }
  );

  /**
   * GET /api/users/me/games
   * Get current authenticated user's games
   */
  fastify.get(
    "/api/users/me/games",
    {
      preHandler: authenticationHook,
      schema: {
        description: "Get current authenticated user's games",
        tags: ["Users"],
        response: {
          200: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                status: { type: "string" },
                createdAt: { type: "string" },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const games = await userService.getUserGames(request.user!.id);
      return reply.send(games);
    }
  );

  /**
   * GET /api/users/me/stats
   * Get current authenticated user's statistics
   */
  fastify.get(
    "/api/users/me/stats",
    {
      preHandler: authenticationHook,
      schema: {
        description: "Get current authenticated user's statistics",
        tags: ["Users"],
        response: {
          200: {
            type: "object",
            properties: {
              totalGames: { type: "number" },
              gamesWon: { type: "number" },
              totalRoundsPlayed: { type: "number" },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const stats = await userService.getUserStats(request.user!.id);
      return reply.send(stats);
    }
  );

  // ============ LEADERBOARD ============

  /**
   * GET /api/leaderboard
   * Get global leaderboard (no auth required)
   */
  fastify.get(
    "/api/leaderboard",
    {
      schema: {
        description: "Get global player leaderboard",
        tags: ["Leaderboard"],
        response: {
          200: {
            type: "array",
            items: {
              type: "object",
              properties: {
                userId: { type: "string" },
                username: { type: "string" },
                nickname: { type: "string" },
                gamesPlayed: { type: "number" },
                gamesWon: { type: "number" },
                totalScore: { type: "number" },
              },
            },
          },
        },
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const leaderboard = await userService.getLeaderboard();
      return reply.send(leaderboard);
    }
  );

  // Error handler for user routes
  fastify.setErrorHandler((error, _request, reply) => {
    fastify.log.error(error);
    reply.status(400).send({
      error: error.message || "An error occurred",
    });
  });
}
