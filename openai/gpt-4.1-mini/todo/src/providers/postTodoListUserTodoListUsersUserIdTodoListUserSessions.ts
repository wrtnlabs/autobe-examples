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

export async function postTodoListUserTodoListUsersUserIdTodoListUserSessions(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: ITodoListUserSession.ICreate;
}): Promise<ITodoListUserSession> {
  if (props.user.id !== props.userId) {
    throw new HttpException("Forbidden", 403);
  }

  const now = new Date();
  const created = await MyGlobal.prisma.todo_list_user_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_list_user_id: props.userId,
      ip: (props.body.ip ?? "") satisfies string as string,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: props.body.expiration ?? null,
    },
  });

  return {
    sessionId: created.id,
    userId: created.todo_list_user_id,
    ipAddress: created.ip ?? undefined,
    url: created.href,
    referrerUrl: created.referrer ?? null,
    startTimestamp: toISOStringSafe(created.created_at) satisfies string &
      tags.Format<"date-time"> as string & tags.Format<"date-time">,
    expirationTimestamp: created.expired_at
      ? (toISOStringSafe(created.expired_at) satisfies string &
          tags.Format<"date-time"> as string & tags.Format<"date-time">)
      : null,
    isActive: true,
  };
}
