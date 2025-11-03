import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { ModeratorPayload } from "../../decorators/payload/ModeratorPayload";

/**
 * Authorize middleware for moderator role.
 * Verifies JWT, validates role, and ensures the session and moderator are active.
 */
export async function moderatorAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<ModeratorPayload> {
  const payload = jwtAuthorize({ request }) as ModeratorPayload;

  if (payload.type !== "moderator") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // payload.id is the top-level moderator id and payload.session_id is the session id
  const session = await MyGlobal.prisma.discussion_board_moderator_sessions.findFirst({
    where: {
      id: payload.session_id,
      discussion_board_moderator_id: payload.id,
      expired_at: null,
      moderator: {
        deleted_at: null,
      },
    },
  });

  if (session === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
