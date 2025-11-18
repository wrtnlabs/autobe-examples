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

export async function putTodoListUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoListTodo.IUpdate;
}): Promise<ITodoListTodo> {
  // Step 1: Fetch todo record
  const todo = await MyGlobal.prisma.todo_list_todos.findUnique({
    where: { id: props.todoId },
  });
  if (!todo) throw new HttpException("Todo not found.", 404);

  // Step 2: Enforce ownership/permissions
  if (todo.user_id !== props.user.id)
    throw new HttpException(
      "You do not have permission to update this todo.",
      403,
    );

  // Step 3: For soft delete, prevent user updates (deleted_at not null)
  if (todo.deleted_at != null) {
    throw new HttpException("Cannot update a deleted todo.", 403);
  }

  // Step 4: Prepare update data
  const updateData: Record<string, unknown> = {};

  // Description: optional
  if (typeof props.body.description === "string") {
    // Uniqueness check within user
    const duplicate = await MyGlobal.prisma.todo_list_todos.findFirst({
      where: {
        id: { not: props.todoId },
        user_id: props.user.id,
        description: props.body.description,
        deleted_at: null,
      },
    });
    if (duplicate) {
      throw new HttpException(
        "Duplicate description exists for this user.",
        409,
      );
    }
    updateData.description = props.body.description;
  }

  // completed: optional
  let completed_at: (string & tags.Format<"date-time">) | null | undefined =
    todo.completed_at ? toISOStringSafe(todo.completed_at) : null;
  if (
    typeof props.body.completed === "boolean" &&
    props.body.completed !== todo.completed
  ) {
    if (props.body.completed) {
      completed_at = toISOStringSafe(new Date());
      updateData.completed = true;
      updateData.completed_at = completed_at;
    } else {
      updateData.completed = false;
      updateData.completed_at = null;
      completed_at = null;
    }
  }

  // Always set updated_at
  const updated_at = toISOStringSafe(new Date());
  updateData.updated_at = updated_at;

  // Step 5: Update
  const updated = await MyGlobal.prisma.todo_list_todos.update({
    where: { id: props.todoId },
    data: updateData,
  });

  // Step 6: Map to DTO (no type assertion, use correct null/undefined for date fields)
  return {
    id: updated.id,
    description: updated.description,
    completed: updated.completed,
    completed_at: updated.completed_at
      ? toISOStringSafe(updated.completed_at)
      : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
