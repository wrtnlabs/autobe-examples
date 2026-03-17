import { ForbiddenException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { GuestPayload } from "../../decorators/payload/GuestPayload";

export async function guestAuthorize(request: {
  headers: { authorization?: string };
}): Promise<GuestPayload> {
  const payload: GuestPayload = jwtAuthorize({ request }) as GuestPayload;

  if (payload.type !== "guest") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // Query using appropriate field based on schema
  const guest = await MyGlobal.prisma.community_platform_guests.findFirst({
    where: {
      id: payload.id, // Guest is standalone, not extending User
      sessions: {
        some: {
          id: payload.session_id,
          expired_at: { gt: new Date() } // Session not expired
        }
      }
    },
  });

  if (guest === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}