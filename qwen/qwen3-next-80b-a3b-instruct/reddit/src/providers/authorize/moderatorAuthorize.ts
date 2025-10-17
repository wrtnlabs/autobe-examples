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

  // payload.id contains the top-level user table ID (community_platform_member.id)
  // Query for moderator record using member_id foreign key relationship
  const moderator = await MyGlobal.prisma.community_platform_moderator.findFirst({
    where: {
      member_id: payload.id,
      member: {
        deleted_at: null,
      },
    },
  });

  if (moderator === null) {
    throw new ForbiddenException("You're not enrolled as a moderator");
  }

  return payload;
}