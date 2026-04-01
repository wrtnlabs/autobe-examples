import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { MemberPayload } from "../../decorators/payload/MemberPayload";

export async function memberAuthorize(request: {
  headers: { authorization?: string };
}): Promise<MemberPayload> {
  let payload: MemberPayload;

  try {
    payload = jwtAuthorize({ request }) as MemberPayload;
  } catch (error) {
    if (error instanceof UnauthorizedException) throw error;
    throw new UnauthorizedException("Invalid authorization token");
  }

  if (payload.type !== "member") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  const member = await MyGlobal.prisma.erp_hrm_time_members.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
  });

  if (member === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  const session = await MyGlobal.prisma.erp_hrm_time_member_sessions.findFirst({
    where: {
      id: payload.session_id,
      erp_hrm_time_member_id: payload.id,
      expired_at: { gt: new Date() },
    },
  });

  if (session === null) {
    throw new UnauthorizedException("Session expired");
  }

  return payload;
}