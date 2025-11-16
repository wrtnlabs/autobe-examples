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

export async function getTodoListUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<ITodoListTodo> {
  const todo = await MyGlobal.prisma.todo_list_todos.findUnique({
    where: {
      id: props.todoId,
    },
  });

  if (!todo || todo.deleted_at !== null) {
    throw new HttpException("Todo not found", 404);
  }

  if (todo.todo_list_user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }

  return {
    id: todo.id,
    title: todo.title,
    description: todo.description,
    status: typia.assert<"completed" | "pending" | "in_progress" | "cancelled">(
      todo.status,
    ),
    priority: typia.assert<"low" | "medium" | "high" | null | undefined>(
      todo.priority,
    ),
    due_date: todo.due_date ? toISOStringSafe(todo.due_date) : null,
    completed: todo.completed,
    completed_at: todo.completed_at ? toISOStringSafe(todo.completed_at) : null,
    created_at: toISOStringSafe(todo.created_at),
    updated_at: toISOStringSafe(todo.updated_at),
    deleted_at: todo.deleted_at ? toISOStringSafe(todo.deleted_at) : null,
  };
}
