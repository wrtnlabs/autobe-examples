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

export async function getTodoListUserTodoListTodosId(props: {
  user: UserPayload;
  id: string & tags.Format<"uuid">;
}): Promise<ITodoListTodo> {
  const todo = await MyGlobal.prisma.todo_list_todos.findUnique({
    where: { id: props.id },
  });

  if (!todo) {
    throw new HttpException("Todo not found", 404);
  }

  if (todo.user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }

  return {
    id: todo.id,
    title: todo.title,
    description: todo.description === null ? undefined : todo.description,
    status: typia.assert<"pending" | "completed" | "deleted">(todo.status),
    due_date: todo.due_date === null ? null : toISOStringSafe(todo.due_date),
    created_at: toISOStringSafe(todo.created_at),
    updated_at: toISOStringSafe(todo.updated_at),
  };
}
