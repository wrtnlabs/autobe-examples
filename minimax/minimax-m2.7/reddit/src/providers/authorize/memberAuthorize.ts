import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
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

  const session = await MyGlobal.prisma.reddit_clone_member_sessions.findFirst({
    where: {
      id: payload.session_id,
      reddit_clone_member_id: payload.id,
      member: {
        deleted_at: null,
      },
      expired_at: {
        gt: new Date(),
      },
    },
  });

  if (session === null) {
    throw new UnauthorizedException("Session invalid or expired");
  }

  return payload;
}