import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<ITodoTodo> {
  const todo = await MyGlobal.prisma.todo_todos.findFirst({
    where: {
      id: props.todoId,
      user_id: props.user.id,
    },
  });
  if (todo === null) {
    throw new HttpException("Todo not found", 404);
  }
  return {
    id: todo.id,
    user_id: todo.user_id,
    title: todo.title,
    description: Object.prototype.hasOwnProperty.call(todo, "description")
      ? todo.description === null
        ? null
        : todo.description
      : undefined,
    due_date: Object.prototype.hasOwnProperty.call(todo, "due_date")
      ? todo.due_date === null
        ? null
        : toISOStringSafe(todo.due_date)
      : undefined,
    priority: Object.prototype.hasOwnProperty.call(todo, "priority")
      ? todo.priority === null
        ? null
        : typia.assert<"low" | "medium" | "high">(todo.priority)
      : undefined,
    is_completed: todo.is_completed,
    completed_at: Object.prototype.hasOwnProperty.call(todo, "completed_at")
      ? todo.completed_at === null
        ? null
        : toISOStringSafe(todo.completed_at)
      : undefined,
    created_at: toISOStringSafe(todo.created_at),
    updated_at: toISOStringSafe(todo.updated_at),
  };
}
