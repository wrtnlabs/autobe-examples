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

export async function putTodoListUserTodoListUsersTodoListUserIdTodoListUserSessionsId(props: {
  user: UserPayload;
  todoListUserId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
  body: ITodoListUserSession.IUpdate;
}): Promise<ITodoListUserSession> {
  const existing = await MyGlobal.prisma.todo_list_user_sessions.findUnique({
    where: { id: props.id },
  });

  if (!existing) {
    throw new HttpException("todoListUserSession not found", 404);
  }

  if (existing.todo_list_user_id !== props.todoListUserId) {
    throw new HttpException("Forbidden", 403);
  }

  const updated = await MyGlobal.prisma.todo_list_user_sessions.update({
    where: { id: props.id },
    data: {
      ip: props.body.ip ?? existing.ip,
      href: props.body.href ?? existing.href,
      referrer: props.body.referrer ?? existing.referrer,
      expired_at: props.body.expired_at ?? existing.expired_at ?? null,
    },
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
