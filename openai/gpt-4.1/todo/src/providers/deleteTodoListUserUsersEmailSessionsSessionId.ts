import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoListUserUsersEmailSessionsSessionId(props: {
  user: UserPayload;
  email: string;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find user by email; must exist for lookup
  const userRecord = await MyGlobal.prisma.todo_list_users.findUnique({
    where: {
      email: props.email,
    },
  });
  if (!userRecord) {
    throw new HttpException("User not found", 404);
  }

  // Enforce cross-check: session must match both sessionId and user.id
  const sessionRecord =
    await MyGlobal.prisma.todo_list_user_sessions.findUnique({
      where: {
        id: props.sessionId,
      },
    });
  if (!sessionRecord || sessionRecord.todo_list_user_id !== userRecord.id) {
    throw new HttpException("Session not found or not owned by user", 404);
  }
  if (userRecord.id !== props.user.id) {
    // Authenticated user does not actually own this email
    throw new HttpException("Cannot delete a session of another user", 403);
  }

  // Actually delete the session (hard delete, no soft delete allowed)
  await MyGlobal.prisma.todo_list_user_sessions.delete({
    where: {
      id: props.sessionId,
    },
  });
}
