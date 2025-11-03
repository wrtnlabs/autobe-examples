import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import { TodouserPayload } from "../decorators/payload/TodouserPayload";

export async function postTodoListTodoUserTodos(props: {
  todoUser: TodouserPayload;
  body: ITodoListTodo.ICreate;
}): Promise<ITodoListTodo> {
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.todo_list_todos.create({
    data: {
      id: v4(),
      todo_list_todouser_id: props.todoUser.id,
      title: props.body.title,
      description: props.body.description ?? null,
      is_completed: false,
      created_at: now,
      updated_at: now,
      completed_at: null,
    },
  });
  return {
    id: created.id,
    todo_list_todouser_id: created.todo_list_todouser_id,
    title: created.title,
    description: created.description ?? undefined,
    is_completed: created.is_completed,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    completed_at:
      created.completed_at !== null
        ? toISOStringSafe(created.completed_at)
        : null,
  };
}
