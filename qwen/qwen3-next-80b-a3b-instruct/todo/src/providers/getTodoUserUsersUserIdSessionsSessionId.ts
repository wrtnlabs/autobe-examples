import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUserSession";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoUserUsersUserIdSessionsSessionId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<ITodoUserSession> {
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "You are only authorized to view your own session.",
      403,
    );
  }
  const session = await MyGlobal.prisma.todo_user_sessions.findFirst({
    where: {
      id: props.sessionId,
      todo_user_id: props.userId,
    },
  });
  if (!session) {
    throw new HttpException("Session not found.", 404);
  }
  return {
    id: session.id,
    todo_user_id: session.todo_user_id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at: session.expired_at
      ? toISOStringSafe(session.expired_at)
      : undefined,
  };
}
