import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoAppUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string;
}): Promise<ITodoAppTodo> {
  const todo = await MyGlobal.prisma.todo_app_todos.findUnique({
    where: {
      id: props.todoId,
      todo_app_user_id: props.user.id,
    },
    select: {
      id: true,
      title: true,
      description: true,
      completion_status: true,
      created_at: true,
      updated_at: true,
      start_date: true,
      due_date: true,
      deleted_at: true,
    },
  });
  if (!todo) {
    throw new HttpException("Todo not found", 404);
  }
  return {
    id: todo.id,
    title: todo.title,
    description: todo.description === null ? undefined : todo.description,
    completion_status: todo.completion_status,
    created_at: toISOStringSafe(todo.created_at),
    updated_at: toISOStringSafe(todo.updated_at),
    start_date:
      todo.start_date === null ? undefined : toISOStringSafe(todo.start_date),
    due_date:
      todo.due_date === null ? undefined : toISOStringSafe(todo.due_date),
    is_deleted: todo.deleted_at !== null,
  };
}
