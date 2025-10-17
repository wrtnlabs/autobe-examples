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
  const { user, todoId } = props;

  const todo = await MyGlobal.prisma.todo_app_todos.findUnique({
    where: { id: todoId },
  });

  if (!todo) throw new HttpException("Not Found", 404);

  if (todo.deleted_at !== null) throw new HttpException("Not Found", 404);

  if (todo.user_id !== user.id) {
    throw new HttpException(
      "Unauthorized: You can only access your own todos",
      403,
    );
  }

  return {
    id: todo.id as string & tags.Format<"uuid">,
    user_id: todo.user_id as string & tags.Format<"uuid">,
    title: todo.title,
    description: todo.description ?? null,
    is_completed: todo.is_completed,
    completed_at: todo.completed_at ? toISOStringSafe(todo.completed_at) : null,
    position: todo.position ?? null,
    created_at: toISOStringSafe(todo.created_at),
    updated_at: toISOStringSafe(todo.updated_at),
    deleted_at: todo.deleted_at ? toISOStringSafe(todo.deleted_at) : null,
  };
}
