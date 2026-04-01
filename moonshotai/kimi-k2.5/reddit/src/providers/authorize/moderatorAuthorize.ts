import { ForbiddenException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { ModeratorPayload } from "../../decorators/payload/ModeratorPayload";

export async function moderatorAuthorize(request: {
  headers: { authorization?: string };
}): Promise<ModeratorPayload> {
  const payload: ModeratorPayload = jwtAuthorize({ request }) as ModeratorPayload;

  if (payload.type !== "moderator") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  const moderator = await MyGlobal.prisma.reddit_like_moderators.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
      sessions: {
        some: {
          id: payload.session_id,
          OR: [
            { expired_at: null },
            { expired_at: { gt: new Date() } }
          ]
        }
      }
    },
  });

  if (moderator === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}