// Game API Routes
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import * as gameService from "../core/gameService.js";
import * as userService from "../core/userService.js";
import { authenticationHook } from "../middleware/authMiddleware.js";
import { GameLobbyService } from "../core/GameLobbyService.js";

// Request body types
interface CreateGameBody {
  humanPlayerName: string;
  personas: string[];
  pointsToWin?: number;
}

interface PlayCardsBody {
  playerId: string;
  cardIds: string[];
}

interface JudgeBody {
  winnerIndex: number;
}

interface GameParams {
  gameId: string;
}

interface PlayerParams {
  gameId: string;
  playerId: string;
}

export async function registerGameRoute(
  fastify: FastifyInstance
): Promise<void> {
  // Get available personas (default + custom)
  fastify.get(
    "/api/personas",
    {
      schema: {
        description: "Get list of available AI personas (default + custom)",
        tags: ["Personas"],
        response: {
          200: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
                description: { type: "string" },
                isCustom: { type: "boolean" },
              },
            },
          },
        },
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const personas = await gameService.getAvailablePersonas();
      const customPersonaIds = new Set(
        (await gameService.getAllCustomPersonas()).map((p) => p.id)
      );

      return reply.send(
        personas.map((p) => ({
          id: p.id,
          name: p.name,
          description:
            p.description || p.systemPrompt.substring(0, 100) + "...",
          isCustom: customPersonaIds.has(p.id),
        }))
      );
    }
  );

  // Create custom persona
  fastify.post(
    "/api/personas",
    {
      schema: {
        description: "Create a custom AI persona",
        tags: ["Personas"],
        body: {
          type: "object",
          required: ["name", "systemPrompt"],
          properties: {
            name: { type: "string", minLength: 1, maxLength: 100 },
            systemPrompt: { type: "string", minLength: 10 },
            description: { type: "string", maxLength: 500 },
          },
        },
        response: {
          201: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              systemPrompt: { type: "string" },
              description: { type: "string" },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: { name: string; systemPrompt: string; description?: string };
      }>,
      reply: FastifyReply
    ) => {
      const { name, systemPrompt, description } = request.body;
      const persona = await gameService.createCustomPersona(
        name,
        systemPrompt,
        description
      );
      return reply.status(201).send(persona);
    }
  );

  // Get all custom personas
  fastify.get(
    "/api/personas/custom",
    {
      schema: {
        description: "Get all custom personas",
        tags: ["Personas"],
        response: {
          200: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
                systemPrompt: { type: "string" },
                description: { type: "string" },
              },
            },
          },
        },
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const personas = await gameService.getAllCustomPersonas();
      return reply.send(personas);
    }
  );

  // Get single custom persona
  fastify.get(
    "/api/personas/custom/:id",
    {
      schema: {
        description: "Get a custom persona by ID",
        tags: ["Personas"],
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              systemPrompt: { type: "string" },
              description: { type: "string" },
            },
          },
          404: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params;
      const persona = await gameService.getCustomPersona(id);
      if (!persona) {
        return reply.status(404).send({ error: "Persona not found" });
      }
      return reply.send(persona);
    }
  );

  // Update custom persona
  fastify.put(
    "/api/personas/custom/:id",
    {
      schema: {
        description: "Update a custom persona",
        tags: ["Personas"],
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
        body: {
          type: "object",
          properties: {
            name: { type: "string", minLength: 1, maxLength: 100 },
            systemPrompt: { type: "string", minLength: 10 },
            description: { type: "string", maxLength: 500 },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              systemPrompt: { type: "string" },
              description: { type: "string" },
            },
          },
          404: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: { name?: string; systemPrompt?: string; description?: string };
      }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params;
      const { name, systemPrompt, description } = request.body;

      try {
        const persona = await gameService.updateCustomPersona(id, {
          name,
          systemPrompt,
          description,
        });
        return reply.send(persona);
      } catch (error: any) {
        if (error.message.includes("not found")) {
          return reply.status(404).send({ error: error.message });
        }
        return reply.status(400).send({ error: error.message });
      }
    }
  );

  // Delete custom persona
  fastify.delete(
    "/api/personas/custom/:id",
    {
      schema: {
        description: "Delete a custom persona",
        tags: ["Personas"],
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
            },
          },
          404: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params;
      try {
        await gameService.deleteCustomPersona(id);
        return reply.send({ message: "Persona deleted successfully" });
      } catch (error: any) {
        return reply.status(404).send({ error: "Persona not found" });
      }
    }
  );

  // Create new game
  fastify.post<{ Body: CreateGameBody }>(
    "/api/games",
    {
      preHandler: authenticationHook,
      schema: {
        description: "Create a new game. Requires authentication.",
        tags: ["Game"],
        body: {
          type: "object",
          required: ["humanPlayerName", "personas"],
          properties: {
            humanPlayerName: { type: "string", minLength: 1 },
            personas: {
              type: "array",
              items: { type: "string" },
              minItems: 2,
              maxItems: 7,
            },
            pointsToWin: { type: "number", minimum: 1, maximum: 20 },
          },
        },
        response: {
          201: {
            type: "object",
            properties: {
              gameId: { type: "string" },
              humanPlayerId: { type: "string" },
              message: { type: "string" },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: CreateGameBody }>,
      reply: FastifyReply
    ) => {
      const { humanPlayerName, personas, pointsToWin } = request.body;
      const apiKey = await userService.getUserOpenAIKey(request.user!.id);

      const { gameId, humanPlayerId } = await gameService.createGame(
        {
          humanPlayerName,
          personas,
          pointsToWin,
        },
        apiKey ?? undefined,
        request.user!.id
      );

      return reply.status(201).send({
        gameId,
        humanPlayerId,
        message:
          "Game created. Connect via Socket.IO and call POST /api/games/:gameId/start to begin.",
      });
    }
  );

  // Join game (resolve or create playerId for authenticated user)
  fastify.post<{ Params: GameParams; Body: { playerName?: string } }>(
    "/api/games/:gameId/join",
    {
      preHandler: authenticationHook,
      schema: {
        description:
          "Resolve (or create in lobby) the human playerId for the authenticated user",
        tags: ["Game"],
        params: {
          type: "object",
          properties: {
            gameId: { type: "string" },
          },
        },
        body: {
          type: "object",
          properties: {
            playerName: { type: "string" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              playerId: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { gameId } = request.params;
      const lobby = new GameLobbyService();
      const { playerId } = await lobby.joinGame(
        gameId,
        request.user!,
        request.body?.playerName
      );
      return reply.send({ playerId });
    }
  );

  // Start game
  fastify.post<{ Params: GameParams }>(
    "/api/games/:gameId/start",
    {
      preHandler: authenticationHook,
      schema: {
        description: "Start the game (deals cards, begins first round)",
        tags: ["Game"],
        params: {
          type: "object",
          properties: {
            gameId: { type: "string" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
              game: { type: "object" },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: GameParams }>,
      reply: FastifyReply
    ) => {
      const { gameId } = request.params;
      const apiKey = await userService.getUserOpenAIKey(request.user!.id);

      await gameService.startGame(gameId, apiKey ?? undefined);
      const gameResponse = gameService.getGameResponse(gameId);

      return reply.send({
        message: "Game started!",
        game: gameResponse,
      });
    }
  );

  // Get game state
  fastify.get<{ Params: GameParams }>(
    "/api/games/:gameId",
    {
      schema: {
        description: "Get current game state",
        tags: ["Game"],
        params: {
          type: "object",
          properties: {
            gameId: { type: "string" },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: GameParams }>,
      reply: FastifyReply
    ) => {
      const { gameId } = request.params;
      const gameResponse = gameService.getGameResponse(gameId);
      return reply.send(gameResponse);
    }
  );

  // Get player's hand
  fastify.get<{ Params: PlayerParams }>(
    "/api/games/:gameId/players/:playerId/hand",
    {
      schema: {
        description: "Get a player's current hand",
        tags: ["Game"],
        params: {
          type: "object",
          properties: {
            gameId: { type: "string" },
            playerId: { type: "string" },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: PlayerParams }>,
      reply: FastifyReply
    ) => {
      const { gameId, playerId } = request.params;
      const hand = gameService.getPlayerHand(gameId, playerId);
      return reply.send(hand);
    }
  );

  // Play cards (human player)
  fastify.post<{ Params: GameParams; Body: PlayCardsBody }>(
    "/api/games/:gameId/play",
    {
      preHandler: authenticationHook,
      schema: {
        description: "Play white card(s) for the current round",
        tags: ["Game"],
        params: {
          type: "object",
          properties: {
            gameId: { type: "string" },
          },
        },
        body: {
          type: "object",
          required: ["playerId", "cardIds"],
          properties: {
            playerId: { type: "string" },
            cardIds: {
              type: "array",
              items: { type: "string" },
              minItems: 1,
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: GameParams; Body: PlayCardsBody }>,
      reply: FastifyReply
    ) => {
      const { gameId } = request.params;
      const { playerId, cardIds } = request.body;
      const apiKey = await userService.getUserOpenAIKey(request.user!.id);

      await gameService.playHumanCards(gameId, playerId, cardIds, apiKey ?? undefined);
      const gameResponse = gameService.getGameResponse(gameId);

      return reply.send({
        message: "Cards played!",
        game: gameResponse,
      });
    }
  );

  // Judge winner (human czar)
  fastify.post<{ Params: GameParams; Body: JudgeBody }>(
    "/api/games/:gameId/judge",
    {
      preHandler: authenticationHook,
      schema: {
        description: "Judge and pick the winning submission (human czar only)",
        tags: ["Game"],
        params: {
          type: "object",
          properties: {
            gameId: { type: "string" },
          },
        },
        body: {
          type: "object",
          required: ["winnerIndex"],
          properties: {
            winnerIndex: { type: "number", minimum: 0 },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: GameParams; Body: JudgeBody }>,
      reply: FastifyReply
    ) => {
      const { gameId } = request.params;
      const { winnerIndex } = request.body;
      const apiKey = await userService.getUserOpenAIKey(request.user!.id);

      await gameService.humanJudge(gameId, winnerIndex, apiKey ?? undefined);
      const gameResponse = gameService.getGameResponse(gameId);

      return reply.send({
        message: "Winner selected!",
        game: gameResponse,
      });
    }
  );

  // Continue to next round
  fastify.post<{ Params: GameParams }>(
    "/api/games/:gameId/next-round",
    {
      preHandler: authenticationHook,
      schema: {
        description: "Start the next round",
        tags: ["Game"],
        params: {
          type: "object",
          properties: {
            gameId: { type: "string" },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: GameParams }>,
      reply: FastifyReply
    ) => {
      const { gameId } = request.params;
      const apiKey = await userService.getUserOpenAIKey(request.user!.id);

      await gameService.nextRound(gameId, apiKey ?? undefined);
      const gameResponse = gameService.getGameResponse(gameId);

      return reply.send({
        message: "Next round started!",
        game: gameResponse,
      });
    }
  );

  // Error handler for game routes
  fastify.setErrorHandler((error, _request, reply) => {
    fastify.log.error(error);
    reply.status(400).send({
      error: error.message || "An error occurred",
    });
  });
}
