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

  const session = await MyGlobal.prisma.reddit_guest_sessions.findFirst({
    where: {
      id: payload.session_id,
      reddit_guest_id: payload.id,
      expired_at: { gt: new Date() },
      guest: {
        deleted_at: null,
      },
    },
  });

  if (!session) {
    throw new ForbiddenException("Session not found or expired");
  }

  return payload;
}