import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { UserPayload } from "../../decorators/payload/UserPayload";

/**
 * Authenticates a user by verifying JWT, role type, and session.
 * Throws ForbiddenException on mismatch, nonexistence, or invalid session.
 * Returns the payload if authenticated and session is valid.
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

  // Session existence check: payload.id is user id; session_id is the active session
  const session = await MyGlobal.prisma.todo_list_user_sessions.findFirst({
    where: {
      id: payload.session_id,
      todo_list_user_id: payload.id
    }
  });

  if (session === null) {
    throw new ForbiddenException("Session is invalid or expired");
  }

  return payload;
}