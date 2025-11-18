import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postTodoListUserTodos(props: {
  user: UserPayload;
  body: ITodoListTodo.ICreate;
}): Promise<ITodoListTodo> {
  const now = toISOStringSafe(new Date());
  const todoId = v4() as string & tags.Format<"uuid">;

  // completed_at: set only if status === 'completed', else undefined
  const completedAt = props.body.status === "completed" ? now : null;

  const created = await MyGlobal.prisma.todo_list_todos.create({
    data: {
      id: todoId,
      title: props.body.title,
      description:
        props.body.description !== undefined ? props.body.description : null,
      status: props.body.status,
      due_date: props.body.due_date !== undefined ? props.body.due_date : null,
      created_at: now,
      updated_at: now,
      completed_at: completedAt,
      todo_list_user_id: props.user.id,
    },
  });

  return {
    id: created.id,
    title: created.title,
    description: created.description !== null ? created.description : undefined,
    status: typia.assert<"pending" | "completed" | "archived">(created.status),
    due_date:
      created.due_date !== null && created.due_date !== undefined
        ? toISOStringSafe(created.due_date)
        : undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    completed_at:
      created.completed_at !== null && created.completed_at !== undefined
        ? toISOStringSafe(created.completed_at)
        : undefined,
    todo_list_user_id: created.todo_list_user_id,
  };
}
