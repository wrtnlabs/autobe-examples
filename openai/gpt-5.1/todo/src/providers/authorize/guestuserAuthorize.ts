import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { GuestuserPayload } from "../../decorators/payload/GuestuserPayload";

/**
 * Authorize a guest user based on JWT payload and database state.
 *
 * This function validates the JWT, enforces that the payload type is
 * specifically "guestUser", and then checks that the referenced
 * `todo_app_guestusers` record exists and is not soft-deleted.
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

  // payload.id contains the top-level user table ID; for guests this maps
  // directly to the primary key of `todo_app_guestusers`.
  const guest = await MyGlobal.prisma.todo_app_guestusers.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
  });

  if (guest === null) {
    throw new ForbiddenException("You're not enrolled as guest user");
  }

  return payload;
}
