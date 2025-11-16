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

export async function putTodoAppUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoAppTodo.IUpdate;
}): Promise<ITodoAppTodo> {
  // Fetch existing todo to verify it exists and include related user
  const existingTodo = await MyGlobal.prisma.todo_app_todo.findUnique({
    where: { id: props.todoId },
    include: { user: true },
  });

  // Verify todo exists
  if (!existingTodo) {
    throw new HttpException("Todo not found", 404);
  }

  // Verify ownership - todo must belong to authenticated user
  if (existingTodo.todo_app_user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }

  // Determine completed_at value based on is_completed state change
  let completedAt: (string & tags.Format<"date-time">) | null | undefined =
    undefined;

  if (
    props.body.is_completed !== undefined &&
    props.body.is_completed !== null
  ) {
    if (props.body.is_completed === true && !existingTodo.is_completed) {
      // Transitioning from incomplete to complete: set completed_at to now
      completedAt = toISOStringSafe(new Date());
    } else if (props.body.is_completed === false && existingTodo.is_completed) {
      // Transitioning from complete to incomplete: clear completed_at
      completedAt = null;
    }
    // If no state change, completedAt remains undefined (no update)
  }

  // Build update data inline with Prisma
  const updated = await MyGlobal.prisma.todo_app_todo.update({
    where: { id: props.todoId },
    data: {
      ...(props.body.title !== undefined && { title: props.body.title }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.is_completed !== undefined && {
        is_completed: props.body.is_completed,
      }),
      ...(completedAt !== undefined && { completed_at: completedAt as any }),
      updated_at: new Date(),
    },
    include: { user: true },
  });

  // Transform to API response format with proper date string conversions
  return {
    id: updated.id,
    title: updated.title,
    description: updated.description === null ? null : updated.description,
    is_completed: updated.is_completed,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    completed_at:
      updated.completed_at === null
        ? null
        : updated.completed_at !== null
          ? toISOStringSafe(updated.completed_at)
          : null,
    todo_app_user_id: updated.todo_app_user_id,
    user: {
      id: updated.user.id,
      email: updated.user.email,
    },
  };
}
