import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putTodoUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoTodo.IUpdate;
}): Promise<ITodoTodo> {
  const { user, todoId, body } = props;

  // 1) Existence & ownership check
  const owned = await MyGlobal.prisma.todo_todos.findUnique({
    where: { id: todoId },
    select: { id: true, todo_user_id: true },
  });
  if (!owned) throw new HttpException("Not Found", 404);
  if (owned.todo_user_id !== user.id) {
    throw new HttpException("Forbidden", 403);
  }

  // 2) Update allowed fields only
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.todo_todos.update({
    where: { id: todoId },
    data: {
      title: body.title ?? undefined,
      description: body.description ?? undefined,
      due_date:
        body.due_date === undefined
          ? undefined
          : body.due_date === null
            ? null
            : toISOStringSafe(new Date(`${body.due_date}T00:00:00.000Z`)),
      updated_at: now,
    },
    select: {
      id: true,
      title: true,
      description: true,
      due_date: true,
      completed: true,
      created_at: true,
      updated_at: true,
      user: {
        select: {
          id: true,
          email: true,
          created_at: true,
          updated_at: true,
        },
      },
    },
  });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    title: updated.title as string &
      tags.MinLength<1> &
      tags.MaxLength<120> &
      tags.Pattern<"^[^\\r\
]*$">,
    description: updated.description ?? null,
    due_date: updated.due_date
      ? (toISOStringSafe(updated.due_date).slice(0, 10) as string &
          tags.Format<"date">)
      : null,
    completed: updated.completed,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    user: {
      id: updated.user.id as string & tags.Format<"uuid">,
      email: updated.user.email as string & tags.Format<"email">,
      created_at: toISOStringSafe(updated.user.created_at),
      updated_at: toISOStringSafe(updated.user.updated_at),
    },
  };
}
