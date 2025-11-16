import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoAppUserUsersUserIdSessionsSessionId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify the requesting user matches the target user ID
  if (props.user.id !== props.userId) {
    throw new HttpException("You can only delete your own sessions", 403);
  }

  // Verify the session exists and belongs to the user
  const existingSession =
    await MyGlobal.prisma.todo_app_user_sessions.findUnique({
      where: {
        id: props.sessionId,
        todo_app_user_id: props.userId,
      },
    });

  if (!existingSession) {
    throw new HttpException("Session not found", 404);
  }

  // Perform the hard delete operation
  await MyGlobal.prisma.todo_app_user_sessions.delete({
    where: {
      id: props.sessionId,
    },
  });
}
