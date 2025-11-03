import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import { TodouserPayload } from "../decorators/payload/TodouserPayload";

export async function putTodoListTodoUserTodosTodoId(props: {
  todoUser: TodouserPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoListTodo.IUpdate;
}): Promise<ITodoListTodo> {
  // Fetch the target todo by ID and verify ownership
  const todo = await MyGlobal.prisma.todo_list_todos.findUnique({
    where: { id: props.todoId },
  });
  if (!todo) throw new HttpException("Todo item not found", 404);
  if (todo.todo_list_todouser_id !== props.todoUser.id) {
    throw new HttpException("Forbidden: You do not own this todo", 403);
  }

  // Prepare updates for allowed fields, setting updated_at to now
  const now = toISOStringSafe(new Date());

  // Determine title: if present in body, use it; else keep original
  const title = props.body.title !== undefined ? props.body.title : todo.title;
  // Determine description: if present (including null), use it; else keep existing
  const description =
    props.body.description !== undefined
      ? props.body.description
      : todo.description;

  // Determine is_completed state (defaults to existing if omitted)
  const isCompleted =
    props.body.is_completed !== undefined
      ? props.body.is_completed
      : todo.is_completed;

  // Determine completed_at field
  let completedAt: string | null | undefined = undefined;
  if (props.body.is_completed !== undefined) {
    if (props.body.is_completed === true) {
      completedAt =
        props.body.completed_at !== undefined
          ? (props.body.completed_at ?? now)
          : now;
    } else if (props.body.is_completed === false) {
      completedAt = null;
    }
  } else if (props.body.completed_at !== undefined) {
    completedAt = props.body.completed_at;
  } else {
    completedAt =
      todo.completed_at !== null && todo.completed_at !== undefined
        ? toISOStringSafe(todo.completed_at)
        : null;
  }

  // Execute update with only allowed fields
  const updated = await MyGlobal.prisma.todo_list_todos.update({
    where: { id: props.todoId },
    data: {
      title,
      description,
      is_completed: isCompleted,
      completed_at: completedAt ?? undefined,
      updated_at: now,
    },
  });

  // Return output per DTO contract (undefined for omitted optionals, null for explicit nullables)
  return {
    id: updated.id,
    todo_list_todouser_id: updated.todo_list_todouser_id,
    title: updated.title,
    description: updated.description ?? undefined,
    is_completed: updated.is_completed,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    completed_at:
      updated.completed_at !== null && updated.completed_at !== undefined
        ? toISOStringSafe(updated.completed_at)
        : (updated.completed_at ?? undefined),
  };
}
