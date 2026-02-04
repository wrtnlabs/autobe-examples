import { ForbiddenException, UnauthorizedException } from "@nestjs/common";

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

  // payload.id contains top-level user table ID from community_platform_members
  // Prisma uses field 'member_id' for foreign key to community_platform_members
  const moderator = await MyGlobal.prisma.community_platform_moderators.findFirst({
    where: {
      member_id: payload.id, // CORRECTED: Use 'member_id' field as per schema
      deleted_at: null, // Soft-delete check for active status
      community_platform_member_sessions: {
        some: {
          id: payload.session_id,
          expired_at: { gt: new Date() }, // Expiration check
        },
      },
    },
  });

  if (moderator === null) {
    throw new ForbiddenException("You're not an active moderator");
  }

  return payload;
}