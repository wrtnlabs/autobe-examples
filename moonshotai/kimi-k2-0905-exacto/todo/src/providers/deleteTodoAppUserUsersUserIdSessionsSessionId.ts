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
  // Validate that the authenticated user matches the userId in the path
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "Forbidden - cannot manage sessions for other users",
      403,
    );
  }

  // Check if the session exists and belongs to this user
  const existingSession = await MyGlobal.prisma.todo_app_sessions.findFirst({
    where: {
      id: props.sessionId,
      todo_app_user_id: props.userId,
    },
  });

  if (!existingSession) {
    throw new HttpException(
      "Session not found or does not belong to this user",
      404,
    );
  }

  // Permanently delete the session
  await MyGlobal.prisma.todo_app_sessions.delete({
    where: { id: props.sessionId },
  });
}
