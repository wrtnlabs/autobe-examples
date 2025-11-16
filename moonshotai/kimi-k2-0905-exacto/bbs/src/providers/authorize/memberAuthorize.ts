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

  const session = await MyGlobal.prisma.economic_discussion_member_sessions.findFirst({
    where: {
      id: payload.session_id,
      economic_discussion_member_id: payload.id,
      expired_at: null,
    },
  });

  if (session === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  const member = await MyGlobal.prisma.economic_discussion_members.findFirst({
    where: {
      id: payload.id,
      email_verified: true,
    },
  });

  if (member === null) {
    throw new ForbiddenException("Member not found or email not verified");
  }

  return payload;
}