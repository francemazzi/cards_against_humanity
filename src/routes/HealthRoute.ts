import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { checkOllamaHealth } from "../ai/llm.js";

export async function registerHealthRoute(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions
): Promise<void> {
  fastify.get(
    "/health",
    {
      schema: {
        description: "Health check endpoint",
        tags: ["health"],
        response: {
          200: {
            type: "object",
            properties: {
              status: { type: "string" },
              timestamp: { type: "string" },
              ollama: { type: "string" },
            },
          },
        },
      },
    },
    async (_request, _reply) => {
      const ollamaReady = await checkOllamaHealth();
      return {
        status: "ok",
        timestamp: new Date().toISOString(),
        ollama: ollamaReady ? "available" : "unavailable",
      };
    }
  );
}
