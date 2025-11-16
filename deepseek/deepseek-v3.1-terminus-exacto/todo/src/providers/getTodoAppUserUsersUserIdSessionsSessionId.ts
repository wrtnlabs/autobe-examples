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
  // Verify that the requesting user is accessing their own session
  if (props.user.id !== props.userId) {
    throw new HttpException("You can only access your own sessions", 403);
  }

  const session = await MyGlobal.prisma.todo_app_user_sessions.findUnique({
    where: {
      id: props.sessionId,
      todo_app_user_id: props.userId,
    },
    include: {
      user: true,
    },
  });

  if (!session) {
    throw new HttpException("Session not found", 404);
  }

  // Verify the user exists and is active
  if (
    !session.user ||
    session.user.deleted_at !== null ||
    session.user.status !== "active"
  ) {
    throw new HttpException("Invalid session or user not active", 403);
  }

  return {
    id: session.id,
    user: {
      id: session.user.id,
      email: session.user.email,
      status: session.user.status,
      created_at: toISOStringSafe(session.user.created_at),
    },
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at: session.expired_at
      ? toISOStringSafe(session.expired_at)
      : toISOStringSafe(new Date(0)),
  } satisfies ITodoAppUserSession as ITodoAppUserSession;
}
