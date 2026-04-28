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

  const session = await MyGlobal.prisma.todo_app_member_sessions.findFirst({
    where: {
      id: payload.session_id,
      todo_app_member_id: payload.id,
      expired_at: { gt: new Date() },
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

  return payload;
}