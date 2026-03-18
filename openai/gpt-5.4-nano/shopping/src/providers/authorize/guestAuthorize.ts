import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { GuestPayload } from "../../decorators/payload/GuestPayload";

export async function guestAuthorize(request: {
  headers: { authorization?: string };
}): Promise<GuestPayload> {
  const payload = jwtAuthorize({ request }) as GuestPayload;

  if (payload.type !== "guest") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  const guestSession = await (MyGlobal.prisma as any).guestSessions.findFirst({
    where: {
      id: payload.session_id,
      deleted_at: null,
    },
  });

  if (guestSession === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  const expiredAt = (guestSession as any).expired_at;
  if (expiredAt instanceof Date) {
    if (expiredAt.getTime() <= Date.now()) {
      throw new UnauthorizedException("Session expired");
    }
  } else if (typeof expiredAt === "string") {
    const t = new Date(expiredAt);
    if (!Number.isNaN(t.getTime()) && t.getTime() <= Date.now()) {
      throw new UnauthorizedException("Session expired");
    }
  }

  return payload;
}
