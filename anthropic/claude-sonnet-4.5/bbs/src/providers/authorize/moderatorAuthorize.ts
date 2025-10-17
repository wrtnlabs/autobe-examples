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
    throw new ForbiddenException(`You're not moderator`);
  }

  const moderator = await MyGlobal.prisma.discussion_board_moderators.findFirst({
    where: {
      id: payload.id,
      email_verified: true,
      account_status: "active",
      is_active: true,
      deleted_at: null,
    },
  });

  if (moderator === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}