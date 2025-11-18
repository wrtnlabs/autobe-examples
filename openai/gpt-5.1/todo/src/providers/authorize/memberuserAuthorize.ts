import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { MemberuserPayload } from "../../decorators/payload/MemberuserPayload";

/**
 * Authorize an authenticated member user based on JWT payload and DB state.
 *
 * - Verifies JWT via shared jwtAuthorize helper
 * - Ensures the payload type is strictly "memberuser"
 * - Confirms the session is valid and active
 */
export async function memberuserAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<MemberuserPayload> {
  const payload: MemberuserPayload = jwtAuthorize({ request }) as MemberuserPayload;

  if (payload.type !== "memberuser")
    throw new ForbiddenException(`You're not ${payload.type}`);

  // Validate that the session is still active and bound to the member user
  const session = await MyGlobal.prisma.todo_app_memberuser_sessions.findFirst({
    where: {
      id: payload.session_id,
      todo_app_memberuser_id: payload.id,
      expired_at: null,
    },
  });

  if (session === null)
    throw new ForbiddenException("You're not enrolled");

  return payload;
}
