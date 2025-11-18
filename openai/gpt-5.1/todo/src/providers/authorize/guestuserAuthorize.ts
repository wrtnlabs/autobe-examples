import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { GuestuserPayload } from "../../decorators/payload/GuestuserPayload";

/**
 * Authorize unauthenticated guest users.
 */
export async function guestuserAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<GuestuserPayload> {
  const payload: GuestuserPayload = jwtAuthorize({ request }) as GuestuserPayload;

  if (payload.type !== "guestUser") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  const guest = await MyGlobal.prisma.todo_app_guestusers.findFirst({
    where: {
      id: payload.id,
    },
  });

  // Authorization for guests does not strictly require a persisted guest row,
  // so absence is tolerated. If you want to enforce persisted guest records,
  // uncomment this block:
  // if (guest === null) {
  //   throw new ForbiddenException("Guest identity is not recognized");
  // }

  return payload;
}
