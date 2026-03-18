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
  } catch {
    throw new UnauthorizedException("Invalid or missing authorization token");
  }

  if (payload.type !== "member") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  const member = await MyGlobal.prisma.todo_app_members.findFirst({
    where: {
      id: payload.id,
    },
  });

  if (member === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  const session = await MyGlobal.prisma.todo_app_member_sessions.findFirst({
    where: {
      id: payload.session_id,
      todo_app_member_id: payload.id,
      expired_at: {
        gt: new Date(),
      },
    },
  });

  if (session === null) {
    throw new ForbiddenException("Your session is not active");
  }

  return payload;
}