import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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
  // Verify the requesting user owns the session
  if (props.user.id !== props.userId) {
    throw new HttpException("You can only delete your own sessions", 403);
  }

  // Verify the session exists and belongs to the specified user
  const session = await MyGlobal.prisma.todo_app_user_sessions.findUnique({
    where: {
      id: props.sessionId,
      todo_app_user_id: props.userId,
      expired_at: null,
    },
  });

  if (!session) {
    throw new HttpException("Session not found or already expired", 404);
  }

  // Delete the session permanently
  await MyGlobal.prisma.todo_app_user_sessions.delete({
    where: {
      id: props.sessionId,
    },
  });
}
