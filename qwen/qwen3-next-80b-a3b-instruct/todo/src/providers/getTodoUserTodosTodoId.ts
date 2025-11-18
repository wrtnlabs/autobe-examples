import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<ITodoTodo> {
  const todo = await MyGlobal.prisma.todo_todos.findFirst({
    where: {
      id: props.todoId,
      todo_user_id: props.user.id,
    },
  });

  if (!todo) {
    throw new HttpException("Todo not found", 404);
  }

  const user = await MyGlobal.prisma.todo_user.findUnique({
    where: { id: todo.todo_user_id },
  });

  if (!user) {
    throw new HttpException("User not found", 404);
  }

  return {
    id: todo.id,
    title: todo.title,
    description: todo.description !== null ? todo.description : undefined,
    completed: todo.completed,
    created_at: toISOStringSafe(todo.created_at),
    updated_at: toISOStringSafe(todo.updated_at),
    completed_at: todo.completed_at
      ? toISOStringSafe(todo.completed_at)
      : undefined,
    user: {
      id: user.id,
      email: user.email,
      created_at: toISOStringSafe(user.created_at),
      deleted_at: user.deleted_at
        ? toISOStringSafe(user.deleted_at)
        : undefined,
    },
  };
}
