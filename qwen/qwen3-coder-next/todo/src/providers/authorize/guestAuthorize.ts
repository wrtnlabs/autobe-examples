import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { MyGlobal } from "./MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { GuestPayload } from "../../decorators/payload/GuestPayload";

export async function guestAuthorize(request: {
  headers: { authorization?: string };
}): Promise<GuestPayload> {
  const payload: GuestPayload = jwtAuthorize({ request }) as GuestPayload;

  if (payload.type !== "guest") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  const session = await MyGlobal.prisma.todo_app_guest_sessions.findFirst({
    where: {
      todo_app_guest_id: payload.id,
      expired_at: { gt: new Date() },
      deleted_at: null,
      guest: {
        deleted_at: null,
      },
    },
  });

  if (session === null) {
    throw new UnauthorizedException("Invalid or expired session");
  }

  return payload;
}