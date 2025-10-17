import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { GuestPayload } from "../../decorators/payload/GuestPayload";

/**
 * Authenticate and authorize requests for the "guest" role.
 */
export async function guestAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<GuestPayload> {
  const payload = jwtAuthorize({ request }) as GuestPayload;

  if (payload.type !== "guest") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // payload.id contains top-level user table ID. community_portal_guests
  // is a subsidiary table referencing community_portal_users via user_id.
  const guest = await MyGlobal.prisma.community_portal_guests.findFirst({
    where: {
      user_id: payload.id,
      user: { deleted_at: null },
      OR: [
        { expired_at: null },
        { expired_at: { gt: new Date() } }
      ]
    }
  });

  if (guest === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
