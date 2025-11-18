import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getTodoAppAdminTodosTodoId(props: {
  admin: AdminPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodo> {
  const todo = await MyGlobal.prisma.todo_app_todos.findUnique({
    where: { id: props.todoId },
  });

  if (!todo) {
    throw new HttpException("Todo not found", 404);
  }

  return {
    id: todo.id,
    title: todo.title,
    description:
      typeof todo.description === "undefined"
        ? undefined
        : todo.description === null
          ? null
          : todo.description,
    status: typia.assert<"active" | "deleted" | "completed">(todo.status),
    due_date:
      typeof todo.due_date === "undefined"
        ? undefined
        : todo.due_date === null
          ? null
          : toISOStringSafe(todo.due_date),
    created_at: toISOStringSafe(todo.created_at),
    updated_at: toISOStringSafe(todo.updated_at),
    completed_at:
      typeof todo.completed_at === "undefined"
        ? undefined
        : todo.completed_at === null
          ? null
          : toISOStringSafe(todo.completed_at),
    deleted_at:
      typeof todo.deleted_at === "undefined"
        ? undefined
        : todo.deleted_at === null
          ? null
          : toISOStringSafe(todo.deleted_at),
    todo_app_user_id: todo.todo_app_user_id,
  };
}
