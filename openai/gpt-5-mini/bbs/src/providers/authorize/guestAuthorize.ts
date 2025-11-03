// File path: src/providers/authorize/guestAuthorize.ts
import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { GuestPayload } from "../../decorators/payload/GuestPayload";

/**
 * Verify JWT and ensure the guest actor exists and is active (not soft-deleted).
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

  // payload.id is the top-level guest id per JWT contract
  const guest = await MyGlobal.prisma.discussion_board_guest.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
  });

  if (guest === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
