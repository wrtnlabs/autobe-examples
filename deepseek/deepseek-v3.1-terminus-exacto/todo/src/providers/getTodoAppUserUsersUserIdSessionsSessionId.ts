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
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoAppUserUsersUserIdSessionsSessionId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<ITodoAppUserSession> {
  const { user, userId, sessionId } = props;

  // Verify user authorization - the user can only access their own sessions
  if (user.id !== userId) {
    throw new HttpException(
      "Unauthorized: You can only access your own sessions",
      403,
    );
  }

  // Find the session with user relation
  const session = await MyGlobal.prisma.todo_app_user_sessions.findFirst({
    where: {
      id: sessionId,
      todo_app_user_id: userId,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          status: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    },
  });

  if (!session) {
    throw new HttpException("Session not found", 404);
  }

  // Build the response with proper type handling
  const response = {
    id: session.id,
    user: {
      id: session.user.id,
      email: session.user.email,
      status: session.user.status,
      created_at: toISOStringSafe(session.user.created_at),
      updated_at: toISOStringSafe(session.user.updated_at),
      deleted_at: session.user.deleted_at
        ? toISOStringSafe(session.user.deleted_at)
        : undefined,
    },
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at: session.expired_at ? toISOStringSafe(session.expired_at) : null,
  } satisfies ITodoAppUserSession;

  return response;
}
