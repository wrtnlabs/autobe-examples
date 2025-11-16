import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postTodoAppUserTodos(props: {
  user: UserPayload;
  body: ITodoAppTodo.ICreate;
}): Promise<ITodoAppTodo> {
  const now = new Date();
  const todoId = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.todo_app_todo.create({
    data: {
      id: todoId,
      title: props.body.title,
      description: props.body.description ?? null,
      is_completed: false,
      created_at: now,
      updated_at: now,
      completed_at: null,
      todo_app_user_id: props.user.id,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  const createdAtISO = toISOStringSafe(created.created_at) as string &
    tags.Format<"date-time">;
  const updatedAtISO = toISOStringSafe(created.updated_at) as string &
    tags.Format<"date-time">;
  const completedAtISO = created.completed_at
    ? (toISOStringSafe(created.completed_at) as string &
        tags.Format<"date-time">)
    : undefined;

  return {
    id: todoId,
    title: created.title,
    description: created.description ?? undefined,
    is_completed: created.is_completed,
    created_at: createdAtISO,
    updated_at: updatedAtISO,
    completed_at: completedAtISO,
    todo_app_user_id: props.user.id,
    user: {
      id: created.user.id,
      email: created.user.email,
    },
  };
}
