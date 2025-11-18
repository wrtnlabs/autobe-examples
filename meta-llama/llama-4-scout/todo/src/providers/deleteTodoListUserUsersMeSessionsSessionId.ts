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

export async function deleteTodoListUserUsersMeSessionsSessionId(props: {
  user: UserPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<ITodoListUserSession> {
  // Fetch the session for current user.
  const session = await MyGlobal.prisma.todo_list_user_sessions.findUnique({
    where: { id: props.sessionId },
  });

  if (!session || session.todo_list_user_id !== props.user.id) {
    throw new HttpException("Session not found", 404);
  }

  // If already expired, return as-is
  if (session.expired_at !== null) {
    return {
      id: session.id,
      todo_list_user_id: session.todo_list_user_id,
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
      created_at: toISOStringSafe(session.created_at),
      expired_at: session.expired_at
        ? toISOStringSafe(session.expired_at)
        : null,
    };
  }

  // Set expiration to now
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.todo_list_user_sessions.update({
    where: { id: props.sessionId },
    data: { expired_at: now },
  });

  return {
    id: updated.id,
    todo_list_user_id: updated.todo_list_user_id,
    ip: updated.ip,
    href: updated.href,
    referrer: updated.referrer,
    created_at: toISOStringSafe(updated.created_at),
    expired_at: updated.expired_at ? toISOStringSafe(updated.expired_at) : null,
  };
}
