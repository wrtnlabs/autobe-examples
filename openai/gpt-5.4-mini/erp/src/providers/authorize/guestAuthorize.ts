import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { GuestPayload } from "../../decorators/payload/GuestPayload";

export async function guestAuthorize(request: {
  headers: { authorization?: string };
}): Promise<GuestPayload> {
  let payload: GuestPayload;

  try {
    payload = jwtAuthorize({ request }) as GuestPayload;
  } catch (err) {
    if (err instanceof UnauthorizedException) throw err;
    throw new UnauthorizedException("Invalid guest authorization");
  }

  if (payload.type !== "guest") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  const guest = await MyGlobal.prisma.erp_hrm_time_guests.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
  });

  if (guest === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  const session = await MyGlobal.prisma.erp_hrm_time_guest_sessions.findFirst({
    where: {
      id: payload.session_id,
      erp_hrm_time_guest_id: payload.id,
      deleted_at: null,
    },
  });

  if (session === null) {
    throw new ForbiddenException("Your guest session is invalid");
  }

  return payload;
}