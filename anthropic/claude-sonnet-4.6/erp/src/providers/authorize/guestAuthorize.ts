import { ForbiddenException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { GuestPayload } from "../../decorators/payload/GuestPayload";

export async function guestAuthorize(request: {
  headers: { authorization?: string };
}): Promise<GuestPayload> {
  const payload: GuestPayload = jwtAuthorize({ request }) as GuestPayload;

  if (payload.type !== "guest") {
    throw new ForbiddenException(`You're not a guest, you are ${payload.type}`);
  }

  const guest = await MyGlobal.prisma.erp_hrm_guests.findFirst({
    where: {
      id: payload.id,
    },
  });

  if (guest === null) {
    throw new ForbiddenException("Guest record not found");
  }

  const session = await MyGlobal.prisma.erp_hrm_guest_sessions.findFirst({
    where: {
      id: payload.session_id,
      erp_hrm_guest_id: payload.id,
      expired_at: { gt: new Date() },
    },
  });

  if (session === null) {
    throw new ForbiddenException("Guest session is expired or not found");
  }

  return payload;
}
