import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { MemberuserPayload } from "../../decorators/payload/MemberuserPayload";

/**
 * Authorization provider for regular member users of the todo application.
 *
 * - Verifies JWT using the shared jwtAuthorize helper
 * - Ensures the payload type is strictly "memberuser"
 * - Confirms that both the member user and its session exist and are valid
 *
 * The JWT payload carries the top-level member user id as `id` and the
 * session identifier as `session_id`.
 */
export async function memberuserAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<MemberuserPayload> {
  const payload: MemberuserPayload = jwtAuthorize({ request }) as MemberuserPayload;

  if (payload.type !== "memberuser")
    throw new ForbiddenException("You're not memberuser");

  // Validate that there is an active session belonging to this member user.
  const session = await MyGlobal.prisma.todo_app_memberuser_sessions.findFirst({
    where: {
      id: payload.session_id,
      todo_app_memberuser_id: payload.id,
    },
  });

  if (session === null)
    throw new ForbiddenException("Session is invalid or expired");

  // Validate that the owning member user exists and is in active status.
  const memberUser = await MyGlobal.prisma.todo_app_memberusers.findFirst({
    where: {
      id: payload.id,
      status: "active",
    },
  });

  if (memberUser === null)
    throw new ForbiddenException("You're not enrolled or not active");

  return payload;
}
