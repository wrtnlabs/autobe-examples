import { ForbiddenException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { GuestPayload } from "../../decorators/payload/GuestPayload";

export async function guestAuthorize(request: {
  headers: { authorization?: string };
}): Promise<GuestPayload> {
  const payload: GuestPayload = jwtAuthorize({ request }) as GuestPayload;

  if (payload.type !== "guest") {
    throw new ForbiddenException(`You're not guest`);
  }

  const guest = await MyGlobal.prisma.e_commerce_mall_guests.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
      sessions: {
        some: {
          id: payload.session_id,
          expired_at: { gt: new Date() },
        },
      },
    },
  });

  if (guest === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
