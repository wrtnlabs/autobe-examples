import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postTodoListUserTodoListUsersTodoListUserIdTodoListUserSessions(props: {
  user: UserPayload;
  todoListUserId: string & tags.Format<"uuid">;
  body: ITodoListUserSession.ICreate;
}): Promise<ITodoListUserSession> {
  if (props.user.id !== props.todoListUserId) {
    throw new HttpException(
      "Forbidden: Cannot create session for another user",
      403,
    );
  }

  // Generate new UUID string & brand it without 'as' using direct assignment to typed variable
  const id: string & tags.Format<"uuid"> = v4();

  const created_at: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );

  const created = await MyGlobal.prisma.todo_list_user_sessions.create({
    data: {
      id,
      todo_list_user_id: props.todoListUserId,
      ip: props.body.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      expired_at: props.body.expired_at ?? null,
      created_at,
    },
  });

  return {
    id: created.id,
    todo_list_user_id: created.todo_list_user_id,
    ip: created.ip,
    href: created.href,
    referrer: created.referrer,
    created_at: toISOStringSafe(created.created_at),
    expired_at:
      created.expired_at === null ? null : toISOStringSafe(created.expired_at),
  };
}
