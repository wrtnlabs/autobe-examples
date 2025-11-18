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
  // Fetch existing todo to verify ownership and existence
  const existing = await MyGlobal.prisma.todo_list_todos.findUnique({
    where: { id: props.todoId },
  });

  // Verify todo exists
  if (!existing) {
    throw new HttpException("Todo not found", 404);
  }

  // Verify user owns this todo
  if (existing.user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }

  // Verify todo is not soft-deleted
  if (existing.deleted_at !== null) {
    throw new HttpException("Todo not found", 404);
  }

  // Build update data - only include provided fields
  const updateData: Record<string, unknown> = {};

  // Add optional fields if provided
  if (props.body.title !== undefined) {
    updateData.title = props.body.title;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  if (props.body.priority !== undefined) {
    updateData.priority = props.body.priority;
  }
  if (props.body.due_date !== undefined) {
    updateData.due_date = props.body.due_date;
  }

  // Handle completion status with special timestamp logic
  if (props.body.completed !== undefined) {
    updateData.completed = props.body.completed;
    if (props.body.completed === true) {
      // Mark as completed - set completed_at to current time
      updateData.completed_at = new Date();
    } else {
      // Mark as incomplete - clear completed_at
      updateData.completed_at = null;
    }
  }

  // Always update the updated_at timestamp
  updateData.updated_at = new Date();

  // Apply updates to database
  const updated = await MyGlobal.prisma.todo_list_todos.update({
    where: { id: props.todoId },
    data: updateData,
  });

  // Transform response - convert dates and handle null/undefined properly
  return {
    id: updated.id,
    title: updated.title,
    description: updated.description === null ? undefined : updated.description,
    completed: updated.completed,
    priority:
      updated.priority === null
        ? undefined
        : typia.assert<"low" | "medium" | "high">(updated.priority),
    due_date:
      updated.due_date === null ? undefined : toISOStringSafe(updated.due_date),
    completed_at:
      updated.completed_at === null
        ? undefined
        : toISOStringSafe(updated.completed_at),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
