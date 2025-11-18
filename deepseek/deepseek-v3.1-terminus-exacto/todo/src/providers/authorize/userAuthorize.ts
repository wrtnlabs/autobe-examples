import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { UserPayload } from "../../decorators/payload/UserPayload";

/**
 * Authenticate and authorize a regular todo list user via JWT session token.
 *
 * - Verifies JWT using jwtAuthorize utility
 * - Confirms payload is for correct actor type
 * - Checks that user exists and is not deleted/locked
 * - Validates session is linked to user
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

  // Make sure the user exists, is not locked, and not deleted.
  const user = await MyGlobal.prisma.todo_list_users.findFirst({
    where: {
      id: payload.id,
      locked: false,
      deleted_at: null,
    },
  });
  if (!user) {
    throw new ForbiddenException("You're not enrolled");
  }

  // Confirm the session also belongs to the user
  const session = await MyGlobal.prisma.todo_list_user_sessions.findFirst({
    where: {
      id: payload.session_id,
      user_id: payload.id,
      expired_at: null,
    },
  });
  if (!session) {
    throw new ForbiddenException("Session is invalid or expired");
  }

  return payload;
}
