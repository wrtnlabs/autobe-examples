import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { CommunitymemberPayload } from "../../decorators/payload/CommunitymemberPayload";

/**
 * Authorize a community member using JWT payload and session validation.
 */
export async function communitymemberAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<CommunitymemberPayload> {
  const payload = jwtAuthorize({ request }) as CommunitymemberPayload;

  if (payload.type !== "communitymember") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  const session = await MyGlobal.prisma.community_bbs_communitymember_sessions.findFirst({
    where: {
      id: payload.session_id,
      communityMember: {
        is: {
          id: payload.id,
          deleted_at: null,
          status: { notIn: ["deleted_soft", "banned", "suspended"] },
        },
      },
    },
  });

  if (session === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
