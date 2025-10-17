import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { ModeratorPayload } from "../../decorators/payload/ModeratorPayload";

/**
 * Verifies JWT and ensures the caller is an enrolled, active moderator.
 */
export async function moderatorAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<ModeratorPayload> {
  const payload: ModeratorPayload = jwtAuthorize({ request }) as ModeratorPayload;

  if (payload.type !== "moderator") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // payload.id contains top-level user table ID (community_portal_users.id)
  // community_portal_moderators references the user via user_id
  const moderator = await MyGlobal.prisma.community_portal_moderators.findFirst({
    where: {
      user_id: payload.id,
      is_active: true,
      user: {
        deleted_at: null,
      },
    },
  });

  if (moderator === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
