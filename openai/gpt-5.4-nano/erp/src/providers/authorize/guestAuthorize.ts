import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { GuestPayload } from "../../decorators/payload/GuestPayload";

export async function guestAuthorize(request: {
  headers: { authorization?: string };
}): Promise<GuestPayload> {
  const payload = jwtAuthorize({ request }) as GuestPayload;

  if (payload.type !== "guest") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  try {
    const guestSession = await MyGlobal.prisma.erp_hrm_time_tracking_guest_sessions.findFirst({
      where: {
        id: payload.session_id,
      },
    });

    if (guestSession === null) {
      throw new ForbiddenException("You're not enrolled");
    }
  } catch {
    throw new UnauthorizedException("Invalid authorization");
  }

  return payload;
}
