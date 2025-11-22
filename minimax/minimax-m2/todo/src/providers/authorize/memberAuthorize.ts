import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { MemberPayload } from "../../decorators/payload/MemberPayload";

export async function memberAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<MemberPayload> {
  const payload: MemberPayload = jwtAuthorize({ request }) as MemberPayload;

  if (payload.type !== "member") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // Verify member exists and is active
  const member = await MyGlobal.prisma.todo_app_members.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
      status: "active"
    },
  });

  if (member === null) {
    throw new ForbiddenException("Member not found or inactive");
  }

  // Verify session exists and belongs to the member
  const session = await MyGlobal.prisma.todo_app_member_sessions.findFirst({
    where: {
      id: payload.session_id,
      member_id: payload.id
    },
  });

  if (session === null) {
    throw new ForbiddenException("Invalid session");
  }

  return payload;
}