import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { ModeratorPayload } from "../../decorators/payload/ModeratorPayload";

/**
 * Authenticates and authorizes community platform moderators using JWT.
 * 
 * Ensures that the JWT payload is for a moderator, checks if the moderator exists,
 * and verifies account status and soft-deletion for lifecycle control.
 *
 * @param request Express-style request object with headers
 * @returns ModeratorPayload with authenticated data
 * @throws ForbiddenException if role, lifecycle, or existence check fails
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

  // Because moderator is a standalone actor (not an extension of user),
  // payload.id always refers to the top-level moderator id.
  const moderator = await MyGlobal.prisma.community_platform_moderators.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
      status: "active"
    },
  });

  if (!moderator) {
    throw new ForbiddenException("You're not enrolled or your account is inactive.");
  }

  return payload;
}
