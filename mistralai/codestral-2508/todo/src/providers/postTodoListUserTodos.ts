import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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
  // Step 1: Enforce per-user unique, active (incomplete) title constraint
  const existing = await MyGlobal.prisma.todo_list_todos.findFirst({
    where: {
      todo_list_user_id: props.user.id,
      title: props.body.title,
      completed: false,
    },
  });
  if (existing) {
    throw new HttpException(
      "A pending Todo with this title already exists.",
      409,
    );
  }

  // Step 2: Generate UUID and timestamps
  const now = toISOStringSafe(new Date());
  const todoId = v4();

  // Step 3: Create Todo
  const created = await MyGlobal.prisma.todo_list_todos.create({
    data: {
      id: todoId,
      title: props.body.title,
      description: props.body.description ?? null,
      completed: false,
      created_at: now,
      updated_at: now,
      completed_at: null,
      todo_list_user_id: props.user.id,
    },
  });

  return {
    id: created.id,
    title: created.title,
    description: created.description ?? null,
    completed: created.completed,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    completed_at:
      created.completed_at === null
        ? null
        : toISOStringSafe(created.completed_at),
    todo_list_user_id: created.todo_list_user_id,
  };
}
