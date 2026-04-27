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

  // Query member record - ensure not soft-deleted
  const member = await MyGlobal.prisma.hrm_time_tracking_members.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
  });

  if (member === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  // Check session is not expired
  const session = await MyGlobal.prisma.hrm_time_tracking_member_sessions.findFirst({
    where: {
      id: payload.session_id,
      hrm_time_tracking_member_id: payload.id,
      expired_at: { gt: new Date() },
    },
  });

  if (session === null) {
    throw new ForbiddenException("Session expired");
  }

  return payload;
}