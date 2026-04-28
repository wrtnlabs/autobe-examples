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

  const guest = await MyGlobal.prisma.hrm_platform_guests.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
    include: {
      sessions: {
        where: {
          id: payload.session_id,
          expired_at: { gt: new Date() },
        },
      },
    },
  });

  if (guest === null || guest.sessions.length === 0) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}