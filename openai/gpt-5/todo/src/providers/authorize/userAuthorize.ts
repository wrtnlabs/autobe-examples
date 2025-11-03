import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize"; // ← CRITICAL: Same directory import
import { UserPayload } from "../../decorators/payload/UserPayload";

/**
 * Authenticate a 'user' actor via JWT and active session validation.
 * - Verifies JWT and role discriminator
 * - Confirms an active session belonging to the user (expired_at IS NULL)
 * - Returns the verified payload for controller injection
 */
export async function userAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<UserPayload> {
  const payload: UserPayload = jwtAuthorize({ request }) as UserPayload;

  if (payload.type !== "user") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // Validate that the session exists, belongs to the user, and is active
  const session = await MyGlobal.prisma.todo_user_sessions.findFirst({
    where: {
      id: payload.session_id,
      // Foreign key to top-level user table (todo_users)
      todo_user_id: payload.id,
      // Ensure the session is active
      expired_at: null,
    },
  });

  if (session === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
