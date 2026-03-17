import { ForbiddenException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { GuestPayload } from "../../decorators/payload/GuestPayload";

export async function guestAuthorize(request: {
  headers: { authorization?: string };
}): Promise<GuestPayload> {
  const payload: GuestPayload = jwtAuthorize({ request }) as GuestPayload;

  if (payload.type !== "guest") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // Query to check if guest exists and is not deleted
  const guest = await MyGlobal.prisma.todo_app_guests.findFirst({
    where: {
      id: payload.id, // Guest uses direct id field (not foreign key)
      deleted_at: null, // Check soft-delete
    },
  });

  if (guest === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}