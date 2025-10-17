import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { GuestPayload } from "../../decorators/payload/GuestPayload";

/**
 * Authenticates a guest user based on JWT token. Guests are tracked for browsing without actual login credentials.
 * This function enforces that the JWT payload discriminates "guest", and verifies that the guest record exists and is not deleted.
 *
 * @param request HTTP request object containing headers (with Authorization/Bearer token)
 * @returns GuestPayload containing session-tracking UUID and role type
 * @throws ForbiddenException if the guest record is not found or is deleted/expired
 */
export async function guestAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<GuestPayload> {
  const payload: GuestPayload = jwtAuthorize({ request }) as GuestPayload;

  if (payload.type !== "guest") {
    throw new ForbiddenException(`You're not a guest actor`);
  }

  const guest = await MyGlobal.prisma.discussion_board_guests.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
  });

  if (guest === null) {
    throw new ForbiddenException("Guest session is not active or does not exist");
  }

  return payload;
}
