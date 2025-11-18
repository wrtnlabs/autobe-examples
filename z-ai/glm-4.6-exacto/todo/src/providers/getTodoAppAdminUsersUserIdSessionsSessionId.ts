import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getTodoAppAdminUsersUserIdSessionsSessionId(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<ITodoAppUserSession> {
  // Step 1: Ensure the user exists
  const user = await MyGlobal.prisma.todo_app_users.findUnique({
    where: { id: props.userId },
  });
  if (!user) {
    throw new HttpException("User not found", 404);
  }

  // Step 2: Find the session for this user and sessionId
  const session = await MyGlobal.prisma.todo_app_user_sessions.findUnique({
    where: { id: props.sessionId },
  });
  if (!session || session.user_id !== props.userId) {
    throw new HttpException("Session not found for the specified user", 404);
  }

  // Step 3: Return full session detail in ITodoAppUserSession structure
  return {
    id: session.id,
    user_id: session.user_id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at:
      session.expired_at !== null && session.expired_at !== undefined
        ? toISOStringSafe(session.expired_at)
        : undefined,
  };
}
