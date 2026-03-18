import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { MemberPayload } from "../../decorators/payload/MemberPayload";

export async function memberAuthorize(request: {
  headers: { authorization?: string };
}): Promise<MemberPayload> {
  const payload = jwtAuthorize({ request }) as MemberPayload;

  if (payload.type !== "member") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // Verify member session
  const session = await MyGlobal.prisma.shopping_mall_member_sessions.findFirst({
    where: {
      id: payload.session_id,
      shopping_mall_member_id: payload.id,
      expired_at: { gt: new Date() },
    },
    include: {
      member: true,
    },
  });

  if (session === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  if (session.member.deleted_at !== null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
