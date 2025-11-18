import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function deleteTodoAppAdminUserMemberUsersMemberUserIdSessionsSessionId(props: {
  adminUser: AdminuserPayload;
  memberUserId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Ensure the target member user exists
  const memberUser = await MyGlobal.prisma.todo_app_memberusers.findFirst({
    where: {
      id: props.memberUserId,
    },
  });

  if (memberUser === null) {
    throw new HttpException("Member user not found", 404);
  }

  // Ensure the session exists and belongs to the specified member user
  const session = await MyGlobal.prisma.todo_app_memberuser_sessions.findFirst({
    where: {
      id: props.sessionId,
      todo_app_memberuser_id: props.memberUserId,
    },
  });

  if (session === null) {
    throw new HttpException("Session not found for this member user", 404);
  }

  // Hard delete the session record
  await MyGlobal.prisma.todo_app_memberuser_sessions.delete({
    where: {
      id: props.sessionId,
    },
  });
}
