import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSession";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoAppUserUsersUserIdSessionsSessionId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<ITodoAppSession> {
  // Verify authorization - user can only access their own sessions
  if (props.user.id !== props.userId) {
    throw new HttpException("You can only access your own sessions", 403);
  }

  // Find the session by sessionId and userId
  const session = await MyGlobal.prisma.todo_app_sessions.findUnique({
    where: {
      id: props.sessionId,
      todo_app_user_id: props.userId,
    },
  });

  if (!session) {
    throw new HttpException("Session not found", 404);
  }

  // Return session data with proper date conversion
  return {
    id: session.id,
    todo_app_user_id: session.todo_app_user_id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    device_type: session.device_type,
    device_name: session.device_name,
    session_type: session.session_type,
    is_valid: session.is_valid,
    created_at: toISOStringSafe(session.created_at),
    expired_at: session.expired_at
      ? toISOStringSafe(session.expired_at)
      : session.expired_at,
  };
}
