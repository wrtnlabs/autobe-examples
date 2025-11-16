import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { MemberPayload } from "../../decorators/payload/MemberPayload";

export async function memberAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<MemberPayload> {
  const payload: MemberPayload = jwtAuthorize({ request }) as MemberPayload;

  if (payload.type !== "member") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  const session = await MyGlobal.prisma.discussion_board_member_sessions.findFirst({
    where: {
      id: payload.session_id,
      discussion_board_member_id: payload.id,
      expired_at: null,
    },
    select: {
      id: true,
      member: {
        select: {
          id: true,
          status: true,
          email_verified: true,
        },
      },
    },
  });

  if (session === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  if (session.member.status !== "active") {
    throw new ForbiddenException("Your account is not active");
  }

  if (session.member.email_verified !== true) {
    throw new ForbiddenException("Your email is not verified");
  }

  return payload;
}
