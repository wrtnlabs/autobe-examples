import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { MemberPayload } from "../../decorators/payload/MemberPayload";

/**
 * Verifies JWT token and ensures the member session and member record are valid.
 */
export async function memberAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<MemberPayload> {
  const payload = jwtAuthorize({ request }) as MemberPayload;

  if (payload.type !== "member") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // payload.id is the top-level member id; session_id is the session record id
  const session = await MyGlobal.prisma.discussion_board_member_sessions.findFirst({
    where: {
      id: payload.session_id,
      member: {
        id: payload.id,
        deleted_at: null,
      },
      OR: [
        { expired_at: null },
        { expired_at: { gt: new Date() } },
      ],
    },
  });

  if (session === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
