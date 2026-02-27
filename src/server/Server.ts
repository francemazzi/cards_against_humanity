import Fastify, { FastifyInstance } from "fastify";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import { Server as HttpServer } from "http";
import { getSwaggerConfig } from "../config/SwaggerConfig.js";
import { getPort, getHost } from "../config/ServerConfig.js";
import { registerHealthRoute } from "../routes/HealthRoute.js";
import { registerGameRoute } from "../routes/GameRoute.js";
import { registerUserRoute } from "../routes/UserRoute.js";
import { initSocketServer } from "../socket/SocketManager.js";

// Store HTTP server reference for Socket.IO
let httpServer: HttpServer | null = null;

export function createServer(): FastifyInstance {
  return Fastify({
    logger: true,
  });
}

async function registerPlugins(fastify: FastifyInstance): Promise<void> {
  await fastify.register(cors, {
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Accept"],
    exposedHeaders: ["Set-Cookie"],
  });

  await fastify.register(cookie, {
    secret: process.env.SESSION_SECRET || "default-dev-secret-change-in-prod!!",
  });

  await fastify.register(swagger, getSwaggerConfig());

  await fastify.register(swaggerUi, {
    routePrefix: "/documentation",
    uiConfig: {
      docExpansion: "list",
      deepLinking: false,
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
  });
}

async function registerRoutes(fastify: FastifyInstance): Promise<void> {
  await fastify.register(registerHealthRoute);
  await fastify.register(registerGameRoute);
  await fastify.register(registerUserRoute);
}

export async function initializeServer(
  fastify: FastifyInstance
): Promise<void> {
  await registerPlugins(fastify);
  await registerRoutes(fastify);
}

export async function startServer(fastify: FastifyInstance): Promise<void> {
  try {
    await initializeServer(fastify);

    // Get the underlying HTTP server and initialize Socket.IO
    // Initialize before listen to ensure listeners are properly attached
    httpServer = fastify.server;
    initSocketServer(httpServer);

    const address = await fastify.listen({
      port: getPort(),
      host: getHost(),
    });

    console.log(`Server listening on ${address}`);
    console.log(`Swagger documentation available at ${address}/documentation`);
    console.log(`Socket.IO available at ${address}/socket.io`);
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
}

export async function stopServer(fastify: FastifyInstance): Promise<void> {
  await fastify.close();
}

export function getHttpServer(): HttpServer | null {
  return httpServer;
}
