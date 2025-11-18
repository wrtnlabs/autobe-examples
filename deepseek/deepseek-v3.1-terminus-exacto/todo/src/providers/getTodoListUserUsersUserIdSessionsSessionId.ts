import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";
import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoListUserUsersUserIdSessionsSessionId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<ITodoListUserSession> {
  // Verify the authenticated user is accessing their own sessions
  if (props.user.id !== props.userId) {
    throw new HttpException("You can only access your own user sessions", 403);
  }

  const session = await MyGlobal.prisma.todo_list_user_sessions.findFirst({
    where: {
      id: props.sessionId,
      todo_list_user_id: props.userId,
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
    throw new HttpException("Session not found for the specified user", 404);
  }

  return {
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
    expired_at: session.expired_at
      ? toISOStringSafe(session.expired_at)
      : undefined,
  };
}
