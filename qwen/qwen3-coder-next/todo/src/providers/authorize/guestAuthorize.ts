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
  } catch {
    throw new UnauthorizedException("Invalid or expired token");
  }

  if (payload.type !== "guest") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // Verify guest session exists and is valid
  const session = await MyGlobal.prisma.todo_app_guest_sessions.findFirst({
    where: {
      id: payload.id,
      todo_app_guest_id: payload.id,
      deleted_at: null,
      expired_at: { gt: new Date() },
    },
  });

  if (session === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}