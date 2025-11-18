import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoListUserUsersUserIdSessionsSessionId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify the user ID in the path matches the authenticated user
  if (props.user.id !== props.userId) {
    throw new HttpException("You can only delete your own sessions", 403);
  }

  // Delete the session only if it exists and belongs to the specified user
  const result = await MyGlobal.prisma.todo_list_user_sessions.deleteMany({
    where: {
      id: props.sessionId,
      todo_list_user_id: props.userId,
    },
  });

  // Check if any records were actually deleted
  if (result.count === 0) {
    throw new HttpException("Session not found", 404);
  }
}
