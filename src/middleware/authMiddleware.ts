// Authentication Middleware
// Cookie-based session auth using signed cookies

import { FastifyRequest, FastifyReply, FastifyInstance } from "fastify";
import * as userService from "../core/userService.js";
import type { User } from "../core/types.js";

// Cookie name for the session
export const SESSION_COOKIE = "session";

// Extend FastifyRequest to include authenticated user
declare module "fastify" {
  interface FastifyRequest {
    user?: User;
  }
}

/**
 * Get userId from signed session cookie
 */
function getUserIdFromCookie(request: FastifyRequest): string | undefined {
  const cookie = request.cookies[SESSION_COOKIE];
  if (!cookie) return undefined;

  const unsigned = request.unsignCookie(cookie);
  if (!unsigned.valid || !unsigned.value) return undefined;

  return unsigned.value;
}

/**
 * Set session cookie with userId
 */
export function setSessionCookie(reply: FastifyReply, userId: string): void {
  reply.setCookie(SESSION_COOKIE, userId, {
    signed: true,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.FORCE_HTTPS === "true",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  });
}

/**
 * Clear session cookie
 */
export function clearSessionCookie(reply: FastifyReply): void {
  reply.clearCookie(SESSION_COOKIE, {
    path: "/",
  });
}

/**
 * Authentication hook - requires valid session cookie
 */
export async function authenticationHook(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const userId = getUserIdFromCookie(request);

  if (!userId) {
    reply.status(401).send({
      error: "Authentication required",
      message: "Please login first",
    });
    return;
  }

  try {
    const user = await userService.findUserById(userId);
    if (!user) {
      clearSessionCookie(reply);
      reply.status(401).send({
        error: "Session expired",
        message: "Please login again",
      });
      return;
    }
    request.user = user;
  } catch (error) {
    reply.status(500).send({
      error: "Authentication failed",
      message: "Failed to load user session",
    });
  }
}

/**
 * Optional authentication - loads user if session exists, continues otherwise
 */
export async function optionalAuthenticationHook(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const userId = getUserIdFromCookie(request);
  if (!userId) return;

  try {
    const user = await userService.findUserById(userId);
    if (user) request.user = user;
  } catch {
    // Ignore errors for optional auth
  }
}

/**
 * Register authentication plugin for Fastify
 */
export function registerAuthPlugin(fastify: FastifyInstance): void {
  fastify.decorateRequest("user", null);
}
