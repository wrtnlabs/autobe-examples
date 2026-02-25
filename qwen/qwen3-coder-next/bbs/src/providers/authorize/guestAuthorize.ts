import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
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
    },
  });

  if (guest === null) {
    throw new ForbiddenException("Guest not found");
  }

  return payload;
}