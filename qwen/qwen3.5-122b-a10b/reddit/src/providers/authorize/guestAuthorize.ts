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

  const guest = await MyGlobal.prisma.reddit_platform_guests.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
  });

  if (guest === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  const session = await MyGlobal.prisma.reddit_platform_guest_sessions.findFirst({
    where: {
      reddit_platform_guest_id: guest.id,
      expired_at: { gt: new Date() },
      deleted_at: null,
    },
  });

  if (session === null) {
    throw new ForbiddenException("Your session has expired");
  }

  return payload;
}