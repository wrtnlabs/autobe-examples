import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { GuestuserPayload } from "../../decorators/payload/GuestuserPayload";

/**
 * Authorize a guestUser actor based on JWT payload and database state.
 *
 * This verifies the JWT, checks that the payload type is "guestUser",
 * and ensures that there is a valid guest user and session matching the
 * payload identifiers.
 */
export async function guestuserAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<GuestuserPayload> {
  const payload: GuestuserPayload = jwtAuthorize({ request }) as GuestuserPayload;

  if (payload.type !== "guestUser") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // Top-level user table for this actor is todo_app_guestusers.
  // payload.id: todo_app_guestusers.id
  // payload.session_id: todo_app_guestuser_sessions.id
  const session = await MyGlobal.prisma.todo_app_guestuser_sessions.findFirst({
    where: {
      id: payload.session_id,
      todo_app_guestuser_id: payload.id,
    },
  });

  if (session === null) {
    throw new ForbiddenException("Invalid or expired guest session");
  }

  const guest = await MyGlobal.prisma.todo_app_guestusers.findFirst({
    where: {
      id: payload.id,
      status: "active",
    },
  });

  if (guest === null) {
    throw new ForbiddenException("You're not enrolled as an active guest user");
  }

  return payload;
}
