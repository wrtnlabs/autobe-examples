import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoUserUsersUserIdSessionsSessionId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // First, verify that the session exists and is owned by the user requesting deletion
  const session = await MyGlobal.prisma.todo_user_sessions.findFirst({
    where: {
      id: props.sessionId,
      todo_user_id: props.userId,
    },
  });

  if (!session) {
    throw new HttpException("Session not found or not owned by user", 404);
  }

  // Perform a hard delete (not a soft delete)
  await MyGlobal.prisma.todo_user_sessions.delete({
    where: { id: props.sessionId },
  });
}
