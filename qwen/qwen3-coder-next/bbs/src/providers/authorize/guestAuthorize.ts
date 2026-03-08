import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { MyGlobal } from "../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { GuestPayload } from "../../decorators/payload/GuestPayload";

export async function guestAuthorize(request: {
  headers: { authorization?: string };
}): Promise<GuestPayload> {
  const payload: GuestPayload = jwtAuthorize({ request }) as GuestPayload;

  if (payload.type !== "guest") {
    throw new UnauthorizedException("Invalid token type");
  }

  const guest = await MyGlobal.prisma.discussion_board_guests.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
  });

  if (guest === null) {
    throw new ForbiddenException("Guest not found");
  }

  const session = await MyGlobal.prisma.discussion_board_guest_sessions.findFirst({
    where: {
      guest_id: payload.id,
      expired_at: { gt: new Date() },
    },
  });

  if (session === null) {
    throw new ForbiddenException("Invalid or expired session");
  }

  return payload;
}