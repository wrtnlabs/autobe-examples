import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { UserPayload } from "../../decorators/payload/UserPayload";

/**
 * Authenticates and verifies a Todo List user via JWT and session validation.
 * - Accepts HTTP headers with Bearer JWT.
 * - Verifies the JWT token and asserts it represents a user actor.
 * - Ensures the provided session is valid, active, and belongs to the correct user.
 * - Throws on role mismatch, non-existent user, or invalid session.
 *
 * @param request HTTP request object with headers
 * @returns Payload containing user identity for controller injection
 */
export async function userAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<UserPayload> {
  const payload: UserPayload = jwtAuthorize({ request }) as UserPayload;
  if (payload.type !== "user") {
    throw new ForbiddenException(`You're not user (you are ${payload.type})`);
  }
  // Validate that the session exists, is not expired, and belongs to the correct user (with user not deleted)
  const session = await MyGlobal.prisma.todo_user_sessions.findFirst({
    where: {
      id: payload.session_id,
      expired_at: null,
      todo_user_id: payload.id,
      user: {
        id: payload.id,
      },
    },
  });
  if (!session) {
    throw new ForbiddenException("You're not enrolled or session is invalid.");
  }
  return payload;
}
