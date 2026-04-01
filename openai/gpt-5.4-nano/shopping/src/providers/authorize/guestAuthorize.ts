import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { GuestPayload } from "../../decorators/payload/GuestPayload";

export async function guestAuthorize(request: {
  headers: { authorization?: string };
}): Promise<GuestPayload> {
  let payload: GuestPayload;
  try {
    payload = jwtAuthorize({ request }) as GuestPayload;
  } catch {
    throw new UnauthorizedException("Invalid authorization token");
  }

  if (payload.type !== "guest") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  const session = await MyGlobal.prisma.shopping_mall_guest_sessions.findFirst({
    where: {
      id: payload.session_id,
      deleted_at: null,
      expired_at: { gt: new Date() },
      guest: {
        deleted_at: null,
      },
      shopping_mall_guest_id: payload.id,
    },
    select: { id: true },
  });

  if (session === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
