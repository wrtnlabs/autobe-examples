import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { GuestuserPayload } from "../../decorators/payload/GuestuserPayload";

/**
 * Authorize a guest user based on a JWT payload.
 *
 * Guest users are essentially unauthenticated visitors. In this system,
 * a guest JWT may be issued to represent a long-lived guest identity backed
 * by the `discussion_board_guestusers` table. This provider validates
 * the token type and ensures that the referenced guest record is active.
 */
export async function guestuserAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<GuestuserPayload> {
  const payload: GuestuserPayload = jwtAuthorize({ request }) as GuestuserPayload;

  if (payload.type !== "guestUser") {
    throw new ForbiddenException("You're not guestUser");
  }

  // JWT payload.id is the top-level user identifier. For guest users,
  // this maps directly to the primary key of `discussion_board_guestusers`.
  const guest = await MyGlobal.prisma.discussion_board_guestusers.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
  });

  if (guest === null) {
    throw new ForbiddenException("You're not enrolled as an active guest user");
  }

  return payload;
}
