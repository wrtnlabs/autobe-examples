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

  const member = await MyGlobal.prisma.hrm_time_tracking_members.findFirst({
    where: {
      id: payload.id,
    },
  });

  if (member === null) {
    throw new UnauthorizedException("Invalid member account");
  }

  const session = await MyGlobal.prisma.hrm_time_tracking_member_sessions.findFirst({
    where: {
      id: payload.session_id,
      hrm_time_tracking_member_id: payload.id,
    },
  });

  if (session === null) {
    throw new UnauthorizedException("Invalid member session");
  }

  return payload;
}