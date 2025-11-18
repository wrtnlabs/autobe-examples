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
  // Permanently delete a user session by userId and sessionId.
  const deleted = await MyGlobal.prisma.todo_list_user_sessions.deleteMany({
    where: {
      id: props.sessionId,
      todo_list_user_id: props.userId,
    },
  });

  if (deleted.count === 0) {
    throw new HttpException("Session not found.", 404);
  }
  // No return value on success.
}
