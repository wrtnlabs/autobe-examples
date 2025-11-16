import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { UserPayload } from "../../decorators/payload/UserPayload";

/**
 * Authenticates a standard platform user based on JWT token and session validity.
 * Verifies token payload, user status, session ownership, and soft-deletion.
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

  // Validate user existence, state, and active session
  const session = await MyGlobal.prisma.community_platform_user_sessions.findFirst({
    where: {
      id: payload.session_id,
      community_platform_user_id: payload.id,
      expired_at: null,
      user: {
        deleted_at: null,
        status: "active",
      },
    },
  });

  if (!session) {
    throw new ForbiddenException("You're not enrolled or session invalid.");
  }

  return payload;
}
