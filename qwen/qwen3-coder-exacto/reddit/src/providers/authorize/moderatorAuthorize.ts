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
    throw new ForbiddenException(`You're not a moderator`);
  }

  const record = await MyGlobal.prisma.community_forum_moderators.findFirst({
    where: {
      community_forum_user_id: payload.id,
    },
  });

  if (record === null) {
    throw new ForbiddenException("No matched moderator record exists");
  }

  return payload;
}