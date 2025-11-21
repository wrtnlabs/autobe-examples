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

  // moderator uses community_bbs_moderator table (primary entity)
  // payload.id contains the moderator's ID directly (not a foreign key)
  const moderator = await MyGlobal.prisma.community_bbs_moderator.findFirst({
    where: {
      id: payload.id,
      deleted_at: null
    },
  });

  if (moderator === null) {
    throw new ForbiddenException("You're not enrolled as a moderator");
  }

  return payload;
}