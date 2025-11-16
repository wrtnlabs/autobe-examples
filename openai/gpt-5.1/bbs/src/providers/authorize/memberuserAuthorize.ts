import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { MemberuserPayload } from "../../decorators/payload/MemberuserPayload";

/**
 * Authorize a discussion board member user based on JWT token.
 *
 * - Verifies JWT signature and decodes payload
 * - Ensures the payload type is "memberuser"
 * - Confirms that the top-level member user still exists and is active
 * - Validates that the referenced session belongs to the same member user
 */
export async function memberuserAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<MemberuserPayload> {
  const payload: MemberuserPayload = jwtAuthorize({ request }) as MemberuserPayload;

  if (payload.type !== "memberuser")
    throw new ForbiddenException("You're not memberuser");

  // payload.id is the top-level member user ID
  // payload.session_id is the member user session ID
  const session = await MyGlobal.prisma.discussion_board_memberuser_sessions.findFirst({
    where: {
      id: payload.session_id,
      discussion_board_memberuser_id: payload.id,
    },
  });

  if (session === null)
    throw new ForbiddenException("Session is invalid or expired");

  const memberuser = await MyGlobal.prisma.discussion_board_memberusers.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
      account_status: "active",
    },
  });

  if (memberuser === null)
    throw new ForbiddenException("You're not enrolled or your account is not active");

  const restriction = await MyGlobal.prisma.discussion_board_memberuser_restrictions.findFirst({
    where: {
      discussion_board_memberuser_id: payload.id,
      ended_at: null,
    },
  });

  if (restriction !== null)
    throw new ForbiddenException("Your account is restricted");

  return payload;
}
