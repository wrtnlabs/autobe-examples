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
    throw new UnauthorizedException("Invalid guest authorization token");
  }

  if (payload.type !== "guest") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  const guest = await MyGlobal.prisma.todo_app_guests.findFirst({
    where: {
      id: payload.id,
    },
  });

  if (guest === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}