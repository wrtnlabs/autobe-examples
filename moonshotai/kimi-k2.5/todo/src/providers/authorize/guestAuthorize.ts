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
  } catch (error) {
    throw new UnauthorizedException("Invalid token");
  }

  if (payload.type !== "guest") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  const session = await MyGlobal.prisma.multi_user_todo_guest_sessions.findFirst({
    where: {
      id: payload.session_id,
      multi_user_todo_guest_id: payload.id,
      expired_at: { gt: new Date() },
      guest: {
        deleted_at: null,
      },
    },
  });

  if (session === null) {
    throw new ForbiddenException("Your session is expired or invalid");
  }

  return payload;
}