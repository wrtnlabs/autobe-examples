// File path: src/providers/authorize/guestAuthorize.ts
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize"; // correct same-directory import
import { GuestPayload } from "../../decorators/payload/GuestPayload";

/**
 * Guest authorization provider.
 * Verifies JWT, ensures role is 'guest', and checks the guest record is active.
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

  // payload.id contains the top-level guest table ID
  // Query guest table using top-level id field
  const guest = await MyGlobal.prisma.econ_political_forum_guest.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
    // Only the authorization model is queried — no includes
  });

  if (guest === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
