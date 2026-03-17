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

  const guestSession = await MyGlobal.prisma.ecommerce_mall_guest_sessions.findFirst({
    where: {
      id: payload.id,
      expired_at: { gt: new Date() },
    },
  });

  if (guestSession === null) {
    throw new ForbiddenException("Session expired or invalid");
  }

  return payload;
}