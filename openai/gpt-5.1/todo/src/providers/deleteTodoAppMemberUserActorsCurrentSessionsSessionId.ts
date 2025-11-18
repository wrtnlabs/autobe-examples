import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

export async function deleteTodoAppMemberUserActorsCurrentSessionsSessionId(props: {
  memberUser: MemberuserPayload;
  sessionId: string;
}): Promise<void> {
  const existingSession =
    await MyGlobal.prisma.todo_app_memberuser_sessions.findFirst({
      where: {
        id: props.sessionId,
        todo_app_memberuser_id: props.memberUser.id,
      },
    });

  if (existingSession === null) {
    // Do not reveal whether the session belongs to another user or does not exist at all
    throw new HttpException("Session not found", 404);
  }

  await MyGlobal.prisma.todo_app_memberuser_sessions.delete({
    where: {
      id: props.sessionId,
    },
  });
}
