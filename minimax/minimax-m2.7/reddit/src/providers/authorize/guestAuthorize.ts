import { UnauthorizedException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { GuestPayload } from "../../decorators/payload/GuestPayload";

export async function guestAuthorize(request: {
  headers: { authorization?: string };
}): Promise<GuestPayload> {
  const payload: GuestPayload = jwtAuthorize({ request }) as GuestPayload;

  if (payload.type !== "guest") {
    throw new UnauthorizedException(`Expected guest, got ${payload.type}`);
  }

  const session = await MyGlobal.prisma.reddit_clone_guest_sessions.findFirst({
    where: {
      id: payload.session_id,
      expired_at: { gt: new Date() },
      guest: {
        id: payload.id,
      },
    },
  });

  if (session === null) {
    throw new UnauthorizedException("Session expired or invalid");
  }

  return payload;
}