// File: src/providers/authorize/guestAuthorize.ts
import { ForbiddenException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { GuestPayload } from "../../decorators/payload/GuestPayload";

export async function guestAuthorize(request: {
  headers: { authorization?: string };
}): Promise<GuestPayload> {
  const payload: GuestPayload = jwtAuthorize({ request }) as GuestPayload;

  if (payload.type !== "guest") {
    throw new ForbiddenException(`You're not a guest`);
  }

  const guest = await MyGlobal.prisma.ecommerce_mall_guests.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
  });

  if (guest === null) {
    throw new ForbiddenException("Guest not found");
  }

  const session = await MyGlobal.prisma.ecommerce_mall_guest_sessions.findFirst({
    where: {
      id: payload.session_id,
      expired_at: {
        gt: new Date(),
      },
    },
  });

  if (session === null) {
    throw new ForbiddenException("Session expired or invalid");
  }

  return payload;
}
