import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
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

  const guestSession = await MyGlobal.prisma.reddit_community_guest_sessions.findFirst({
    where: {
      reddit_community_guest_id: payload.id,
      expired_at: { gt: new Date() },
      deleted_at: null,
    },
  });

  if (guestSession === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}