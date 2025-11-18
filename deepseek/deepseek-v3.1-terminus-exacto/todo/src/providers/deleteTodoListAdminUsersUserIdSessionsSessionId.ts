import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteTodoListAdminUsersUserIdSessionsSessionId(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Check that the session exists and is owned by the user
  const session = await MyGlobal.prisma.todo_list_user_sessions.findFirst({
    where: {
      id: props.sessionId,
      user_id: props.userId,
    },
  });
  if (!session) {
    throw new HttpException("Session or user not found.", 404);
  }
  // 2. Hard delete the session
  await MyGlobal.prisma.todo_list_user_sessions.deleteMany({
    where: {
      id: props.sessionId,
      user_id: props.userId,
    },
  });
}
