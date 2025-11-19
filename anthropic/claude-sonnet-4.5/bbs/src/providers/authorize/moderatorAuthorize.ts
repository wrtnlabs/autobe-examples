import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { ModeratorPayload } from "../../decorators/payload/ModeratorPayload";

export async function moderatorAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<ModeratorPayload> {
  const payload: ModeratorPayload = jwtAuthorize({ request }) as ModeratorPayload;

  if (payload.type !== "moderator") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // Verify moderator session exists and is active
  const session = await MyGlobal.prisma.discussion_board_moderator_sessions.findFirst({
    where: {
      id: payload.session_id,
      expired_at: null,
      discussion_board_moderator_id: payload.id,
    },
    include: {
      moderator: true,
    },
  });

  if (session === null) {
    throw new ForbiddenException("Session not found or expired");
  }

  // Verify moderator account is active and not deleted
  if (
    session.moderator.deleted_at !== null ||
    session.moderator.is_active === false ||
    session.moderator.email_verified === false
  ) {
    throw new ForbiddenException("Moderator account is not active or verified");
  }

  return payload;
}