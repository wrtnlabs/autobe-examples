// File path: src/providers/authorize/moderatorAuthorize.ts
import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { ModeratorPayload } from "../../decorators/payload/ModeratorPayload";

/**
 * Verifies JWT and ensures the caller is a valid, active moderator.
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

  // payload.id is the top-level registered user ID.
  const moderator = await MyGlobal.prisma.econ_political_forum_moderator.findFirst({
    where: {
      registereduser_id: payload.id,
      deleted_at: null,
      is_active: true,
      registereduser: {
        deleted_at: null,
        is_banned: false,
      },
    },
  });

  if (moderator === null) {
    throw new ForbiddenException("You're not enrolled as moderator");
  }

  return payload;
}
