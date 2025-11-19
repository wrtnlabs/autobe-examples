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
    include: {
      member: true,
    },
  });

  if (session === null) {
    throw new ForbiddenException("Invalid or expired session");
  }

  if (session.member.deleted_at !== null) {
    throw new ForbiddenException("Account has been deleted");
  }

  if (session.member.is_suspended) {
    throw new ForbiddenException(
      session.member.suspension_reason ??
        "Account is suspended"
    );
  }

  if (!session.member.email_verified) {
    throw new ForbiddenException("Email verification required");
  }

  return payload;
}