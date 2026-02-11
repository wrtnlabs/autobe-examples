import { ForbiddenException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { GuestPayload } from "../../decorators/payload/GuestPayload";

export async function guestAuthorize(request: {
  headers: { authorization?: string };
}): Promise<GuestPayload> {
  const payload: GuestPayload = jwtAuthorize({ request }) as GuestPayload;

  if (payload.type !== "guest") {
    throw new ForbiddenException(`You're not a guest`);
  }

  // Verify session existence and validity
  const session = await MyGlobal.prisma.community_guest_sessions.findFirst({
    where: {
      id: payload.session_id,
      expired_at: { gt: new Date() },
    },
  });

  if (!session) {
    throw new ForbiddenException("Session expired or invalid");
  }

  // Ensure session's guest references matching payload.id (guest account)
  if (session.community_guest_id !== payload.id) {
    throw new ForbiddenException("Session mismatch with guest account");
  }

  // Verify guest account exists and isn't deleted
  const guest = await MyGlobal.prisma.community_guests.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
  });

  if (!guest) {
    throw new ForbiddenException("Guest account is deleted");
  }

  return payload;
}