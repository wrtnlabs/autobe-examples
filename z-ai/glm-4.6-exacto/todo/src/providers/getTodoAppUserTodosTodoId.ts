import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoAppUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodo> {
  const todo = await MyGlobal.prisma.todo_app_todos.findUnique({
    where: {
      id: props.todoId,
      todo_app_user_id: props.user.id,
    },
  });
  if (!todo) {
    throw new HttpException("Todo not found or not authorized to view", 404);
  }
  return {
    id: todo.id,
    title: todo.title,
    description: todo.description ?? undefined,
    status: todo.status as "active" | "completed" | "deleted",
    due_date: todo.due_date ? toISOStringSafe(todo.due_date) : undefined,
    created_at: toISOStringSafe(todo.created_at),
    updated_at: toISOStringSafe(todo.updated_at),
    completed_at: todo.completed_at
      ? toISOStringSafe(todo.completed_at)
      : undefined,
    deleted_at: todo.deleted_at ? toISOStringSafe(todo.deleted_at) : undefined,
    todo_app_user_id: todo.todo_app_user_id,
  };
}
