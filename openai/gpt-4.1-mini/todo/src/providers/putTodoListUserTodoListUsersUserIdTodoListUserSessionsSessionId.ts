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

export async function putTodoListUserTodoListUsersUserIdTodoListUserSessionsSessionId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
  body: ITodoListUserSession.IUpdate;
}): Promise<ITodoListUserSession> {
  if (props.user.id !== props.userId) {
    throw new HttpException("Forbidden", 403);
  }

  const existing = await MyGlobal.prisma.todo_list_user_sessions.findUnique({
    where: { id: props.sessionId },
  });

  if (!existing) {
    throw new HttpException("Session not found", 404);
  }

  if (existing.todo_list_user_id !== props.userId) {
    throw new HttpException("Forbidden", 403);
  }

  const updated = await MyGlobal.prisma.todo_list_user_sessions.update({
    where: { id: props.sessionId },
    data: {
      ip: props.body.ip ?? undefined,
      href: props.body.href ?? undefined,
      referrer: props.body.referrer ?? undefined,
      expired_at:
        props.body.expiration !== undefined
          ? props.body.expiration === null
            ? null
            : new Date(props.body.expiration)
          : undefined,
    },
  });

  return {
    sessionId: updated.id,
    userId: updated.todo_list_user_id,
    ipAddress: updated.ip,
    url: updated.href,
    referrerUrl: updated.referrer ?? undefined,
    startTimestamp: toISOStringSafe(updated.created_at),
    expirationTimestamp:
      updated.expired_at === null
        ? null
        : updated.expired_at
          ? toISOStringSafe(updated.expired_at)
          : undefined,
    isActive: updated.expired_at === null,
  };
}
