import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoListUserTodoListUsersUserIdTodoListUserSessionsSessionId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<ITodoListUserSession> {
  const session = await MyGlobal.prisma.todo_list_user_sessions.findFirst({
    where: {
      id: props.sessionId,
      todo_list_user_id: props.userId,
    },
  });

  if (!session) {
    throw new HttpException("User session not found", 404);
  }

  return {
    sessionId: session.id,
    userId: session.todo_list_user_id,
    ipAddress: session.ip,
    url: session.href,
    referrerUrl: session.referrer ?? null,
    startTimestamp: toISOStringSafe(session.created_at),
    expirationTimestamp: session.expired_at
      ? toISOStringSafe(session.expired_at)
      : null,
    isActive: true,
  };
}
