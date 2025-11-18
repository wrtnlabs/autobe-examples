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

  if (!todo) {
    throw new HttpException("Todo not found", 404);
  }

  if (todo.user_id !== props.user.id) {
    throw new HttpException(
      "Forbidden: You do not have access to this todo.",
      403,
    );
  }

  const completedAt = todo.completed_at
    ? toISOStringSafe(todo.completed_at)
    : undefined;
  const deletedAt = todo.deleted_at
    ? toISOStringSafe(todo.deleted_at)
    : undefined;

  return {
    id: todo.id,
    description: todo.description,
    completed: todo.completed,
    completed_at: completedAt ?? null,
    created_at: toISOStringSafe(todo.created_at),
    updated_at: toISOStringSafe(todo.updated_at),
    deleted_at: deletedAt ?? null,
  };
}
