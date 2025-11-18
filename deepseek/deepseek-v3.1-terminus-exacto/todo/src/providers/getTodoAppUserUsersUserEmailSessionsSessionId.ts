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

export async function getTodoAppUserUsersUserEmailSessionsSessionId(props: {
  user: UserPayload;
  userEmail: string & tags.Format<"email">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<ITodoAppUserSession> {
  const session = await MyGlobal.prisma.todo_app_user_sessions.findFirst({
    where: {
      id: props.sessionId,
      user: {
        email: props.userEmail,
        deleted_at: null,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          status: true,
          last_login_at: true,
        },
      },
    },
  });

  if (!session) {
    throw new HttpException("Session not found", 404);
  }

  return {
    id: session.id,
    todo_app_user_id: session.todo_app_user_id,
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      status: session.user.status,
      last_login_at: session.user.last_login_at
        ? toISOStringSafe(session.user.last_login_at)
        : undefined,
    },
    ip: session.ip,
    user_agent: session.user_agent,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at: session.expired_at
      ? toISOStringSafe(session.expired_at)
      : undefined,
    last_activity_at: toISOStringSafe(session.last_activity_at),
  };
}
