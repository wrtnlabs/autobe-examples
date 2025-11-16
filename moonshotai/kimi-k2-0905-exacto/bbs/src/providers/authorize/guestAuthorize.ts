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

  // payload.id contains top-level guest user ID
  const guest = await MyGlobal.prisma.economic_discussion_guests.findFirst({
    where: {
      id: payload.id,
    },
  });

  if (guest === null) {
    throw new ForbiddenException("Guest user not found");
  }

  return payload;
}