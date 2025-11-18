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
      user_id: props.user.id,
    },
    include: {
      user: true,
    },
  });
  if (!todo) {
    throw new HttpException("Todo not found", 404);
  }
  return {
    id: todo.id,
    description: todo.description,
    is_completed: todo.is_completed,
    completed_at: todo.completed_at
      ? toISOStringSafe(todo.completed_at)
      : undefined,
    created_at: toISOStringSafe(todo.created_at),
    updated_at: toISOStringSafe(todo.updated_at),
    user: {
      id: todo.user.id,
      email: todo.user.email,
      created_at: toISOStringSafe(todo.user.created_at),
      updated_at: toISOStringSafe(todo.user.updated_at),
    },
  };
}
