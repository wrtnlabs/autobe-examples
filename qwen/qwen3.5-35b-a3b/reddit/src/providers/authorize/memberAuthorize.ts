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

  const session = await MyGlobal.prisma.reddit_community_member_sessions.findFirst({
    where: {
      id: payload.session_id,
      expired_at: { gt: new Date() },
      deleted_at: null,
      reddit_community_member_id: payload.id,
    },
  });

  if (session === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}