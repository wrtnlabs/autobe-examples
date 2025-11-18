import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putTodoListAdminTodosTodoId(props: {
  admin: AdminPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoListTodo.IUpdate;
}): Promise<ITodoListTodo> {
  const todo = await MyGlobal.prisma.todo_list_todos.findUnique({
    where: { id: props.todoId },
  });
  if (!todo) {
    throw new HttpException("Todo not found", 404);
  }

  // If description is provided, check uniqueness for (user_id, description, created_at)
  if (typeof props.body.description === "string") {
    const duplicate = await MyGlobal.prisma.todo_list_todos.findFirst({
      where: {
        user_id: todo.user_id,
        description: props.body.description,
        id: { not: todo.id },
        deleted_at: null,
      },
    });
    if (duplicate) {
      throw new HttpException("Duplicate todo description for this user", 409);
    }
  }

  // Compute updated values
  let completed_at = todo.completed_at;
  if (typeof props.body.completed === "boolean") {
    if (props.body.completed && !todo.completed) {
      completed_at = new Date();
    } else if (!props.body.completed && todo.completed) {
      completed_at = null;
    }
    // else, unchanged
  }
  const updated = await MyGlobal.prisma.todo_list_todos.update({
    where: { id: todo.id },
    data: {
      ...(props.body.description !== undefined
        ? { description: props.body.description }
        : {}),
      ...(props.body.completed !== undefined
        ? { completed: props.body.completed }
        : {}),
      completed_at: completed_at,
      updated_at: new Date(),
    },
  });

  return {
    id: updated.id,
    description: updated.description,
    completed: updated.completed,
    completed_at: updated.completed_at
      ? toISOStringSafe(updated.completed_at)
      : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
