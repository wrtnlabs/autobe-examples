import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function postTodoAppUserAuthLogout(props: {
  user: UserPayload;
}): Promise<void> {
  const { user } = props;

  // Get current timestamp for session expiration
  const now = toISOStringSafe(new Date());

  // Update the specific session to mark it as expired
  // Only update if the session hasn't already expired (expired_at is null)
  const updatedSession = await MyGlobal.prisma.todo_app_user_sessions.update({
    where: {
      id: user.session_id,
      todo_app_user_id: user.id, // Ensure session belongs to the authenticated user
      expired_at: null, // Only expire active sessions
    },
    data: {
      expired_at: now,
    },
  });

  // If no session was updated, it means either the session doesn't exist
  // or is already expired. This is acceptable for logout operations.
}
