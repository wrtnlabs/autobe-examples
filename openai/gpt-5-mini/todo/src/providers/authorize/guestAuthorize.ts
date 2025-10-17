import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { GuestPayload } from "../../decorators/payload/GuestPayload";

/**
 * Verify JWT, ensure role is 'guest', and validate the guest record exists and is active.
 */
export async function guestAuthorize(request: {
  headers: { authorization?: string };
}): Promise<GuestPayload> {
  const payload = jwtAuthorize({ request }) as GuestPayload;

  if (payload.type !== "guest") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // JWT payload.id contains the top-level user table ID (guest is top-level here)
  const guest = await MyGlobal.prisma.todo_app_guest.findFirst({
    where: {
      id: payload.id,
      OR: [{ status: "active" }, { status: null }],
    },
  });

  if (guest === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
