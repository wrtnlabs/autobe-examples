import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoAppUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodo> {
  // Fetch the todo item from the database
  const todo = await MyGlobal.prisma.todo_app_todo.findUnique({
    where: { id: props.todoId },
  });

  // Return 404 if todo not found
  if (!todo) {
    throw new HttpException("Todo not found", 404);
  }

  // Verify user owns this todo - return 403 if unauthorized
  if (todo.todo_app_user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }

  // Fetch the user data separately
  const todoUser = await MyGlobal.prisma.todo_app_user.findUnique({
    where: { id: todo.todo_app_user_id },
  });

  // User should exist if foreign key constraint is valid
  if (!todoUser) {
    throw new HttpException("User not found", 500);
  }

  // Transform and return the todo with proper date formatting
  return {
    id: todo.id,
    title: todo.title,
    description: todo.description ?? undefined,
    is_completed: todo.is_completed,
    created_at: toISOStringSafe(todo.created_at),
    updated_at: toISOStringSafe(todo.updated_at),
    completed_at:
      todo.completed_at === null
        ? undefined
        : toISOStringSafe(todo.completed_at),
    todo_app_user_id: todo.todo_app_user_id,
    user: {
      id: todoUser.id,
      email: todoUser.email,
    },
  };
}
