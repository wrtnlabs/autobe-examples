import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function deleteTodoAppUserAuthSessionsSessionId(props: {
  sessionId: string & tags.Format<"uuid">;
}): Promise<ITodoAppUserSession> {
  // Find the session with associated user data
  const session = await MyGlobal.prisma.todo_app_user_sessions.findUnique({
    where: { id: props.sessionId },
    include: {
      user: true,
    },
  });

  if (!session) {
    throw new HttpException("Session not found", 404);
  }

  // Delete the session from database
  await MyGlobal.prisma.todo_app_user_sessions.delete({
    where: { id: props.sessionId },
  });

  // Return deleted session data with proper ISO string conversion
  return {
    id: session.id,
    user_id: session.user_id,
    user: {
      id: session.user.id,
      email: session.user.email,
    },
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at: session.expired_at
      ? toISOStringSafe(session.expired_at)
      : undefined,
  };
}
