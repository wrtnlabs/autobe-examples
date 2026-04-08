import { ForbiddenException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { GuestPayload } from "../../decorators/payload/GuestPayload";

export async function guestAuthorize(request: {
  headers: { authorization?: string };
}): Promise<GuestPayload> {
  const payload: GuestPayload = jwtAuthorize({ request }) as GuestPayload;

  if (payload.type !== "guest") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  const session = await MyGlobal.prisma.reddit_like_guest_sessions.findFirst({
    where: {
      id: payload.session_id,
      redditLikeGuest: {
        deleted_at: null,
      },
      expired_at: { gt: new Date() },
    },
  });

  if (session === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}