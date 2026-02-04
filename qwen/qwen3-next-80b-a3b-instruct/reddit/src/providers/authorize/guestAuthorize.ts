import { ForbiddenException, UnauthorizedException } from "@nestjs/common";

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

  // For guest users, the ID in payload maps directly to guest schema
  const guest = await MyGlobal.prisma.community_platform_guests.findFirst({
    where: {
      id: payload.id,
      // Check for any guest-specific validation fields
      // Since guest users are typically allowed only read access,
      // no soft-delete or expiration checks are needed as they
      // are temporary by design
    },
  });

  if (guest === null) {
    throw new ForbiddenException("Guest access not authorized");
  }

  return payload;
}