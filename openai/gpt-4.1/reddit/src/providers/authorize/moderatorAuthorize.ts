import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { ModeratorPayload } from "../../decorators/payload/ModeratorPayload";

/**
 * Moderator Authorization Provider
 * Verifies JWT, checks for 'moderator' type, confirms the user is an active moderator.
 *
 * @param request Request object containing headers (with Authorization)
 * @returns ModeratorPayload
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

  // 'member_id' field links moderator to members. 'payload.id' is always the top-level member id.
  const moderator = await MyGlobal.prisma.community_platform_moderators.findFirst({
    where: {
      member_id: payload.id, // Link to members table
      deleted_at: null,     // Must not be soft-deleted
      status: "active",    // Only active moderators
    },
  });

  if (moderator === null) {
    throw new ForbiddenException("You're not an active moderator");
  }

  return payload;
}
