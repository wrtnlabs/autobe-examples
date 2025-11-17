import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { GuestPayload } from "../../decorators/payload/GuestPayload";

export async function guestAuthorize(request: { headers: { authorization?: string } }): Promise<GuestPayload> {
  const payload: GuestPayload = jwtAuthorize({ request }) as GuestPayload;

  if (payload.type !== "guest") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // Validate session
  const session = await MyGlobal.prisma.shopping_mall_guest_sessions.findFirst({
    where: {
      id: payload.session_id,
      shoppingMallGuest: {
        id: payload.id
      },
      expired_at: null
    }
  });

  if (session === null) {
    throw new ForbiddenException("Session is invalid or expired");
  }

  // Check guest exists
  const guest = await MyGlobal.prisma.shopping_mall_guests.findFirst({
    where: {
      id: payload.id
    }
  });
  if (guest === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
