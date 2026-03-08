import { ForbiddenException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { MemberPayload } from "../../decorators/payload/MemberPayload";

export async function memberAuthorize(request: {
  headers: { authorization?: string };
}): Promise<MemberPayload> {
  const payload: MemberPayload = jwtAuthorize({ request }) as MemberPayload;

  if (payload.type !== "member") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  const member = await MyGlobal.prisma.discussion_board_members.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
      banned: false,
    },
  });

  if (member === null) {
    throw new ForbiddenException("You're not enrolled or banned");
  }

  const session = await MyGlobal.prisma.discussion_board_member_sessions.findFirst({
    where: {
      id: payload.session_id,
      discussion_board_member_id: payload.id,
      expired_at: { gt: new Date() },
    },
  });

  if (session === null) {
    throw new ForbiddenException("Session expired or invalid");
  }

  return payload;
}