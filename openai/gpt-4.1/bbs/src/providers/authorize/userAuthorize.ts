import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { UserPayload } from "../../decorators/payload/UserPayload";

/**
 * Authenticates and authorizes a discussion board user by JWT.
 * Validates user type and ensures the user is active, email-verified, not blocked, and not soft-deleted.
 * Looks up the user via the correct user-session foreign key in the DB.
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

  // Confirm user session exists, ties to active/unblocked user, and user is not deleted
  const session = await MyGlobal.prisma.discussion_board_user_sessions.findFirst({
    where: {
      id: payload.session_id,
      discussion_board_user_id: payload.id,
      user: {
        deleted_at: null,
        is_active: true,
        is_blocked: false,
        is_email_verified: true
      }
    },
  });

  if (!session) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
