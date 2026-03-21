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

  const member = await MyGlobal.prisma.reddit_clone_members.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
  });

  if (member === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  const session = await MyGlobal.prisma.reddit_clone_member_sessions.findFirst({
    where: {
      id: payload.session_id,
      reddit_clone_member_id: payload.id,
      expired_at: { gt: new Date() },
    },
  });

  if (session === null) {
    throw new ForbiddenException("Session expired");
  }

  return payload;
}