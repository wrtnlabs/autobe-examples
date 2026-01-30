import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { GuestPayload } from "../../decorators/payload/GuestPayload";

export async function guestAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<GuestPayload> {
  const payload: GuestPayload = jwtAuthorize({ request }) as GuestPayload;

  if (payload.type !== "guest") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // Validate guest session exists and is active
  const guestSession = await MyGlobal.prisma.todo_app_guest_sessions.findFirst({
    where: {
      id: payload.session_id,
      // Use correct field name 'expired_at' as defined in the database schema
      expired_at: { gt: new Date() }
    },
  });

  if (guestSession === null) {
    throw new ForbiddenException("Invalid guest session");
  }

  return payload;
}