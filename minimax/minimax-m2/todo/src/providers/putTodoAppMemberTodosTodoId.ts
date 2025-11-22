import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putTodoAppMemberTodosTodoId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoAppTodo.IUpdate;
}): Promise<ITodoAppTodo> {
  // Find existing todo and verify ownership
  const existing = await MyGlobal.prisma.todo_app_todos.findUnique({
    where: { id: props.todoId },
  });

  if (!existing) {
    throw new HttpException("Todo item not found", 404);
  }

  // Verify the todo belongs to the authenticated member and is not deleted
  if (existing.todo_app_member_id !== props.member.id) {
    throw new HttpException(
      "Forbidden - you can only update your own todos",
      403,
    );
  }

  if (existing.deleted_at !== null) {
    throw new HttpException("Cannot update deleted todo item", 400);
  }

  // Handle status change and completed_at automatically
  const updateData: Prisma.todo_app_todosUpdateInput = {
    ...props.body,
    updated_at: new Date(),
  };

  // Clear description if explicitly set to null
  if (props.body.description === null) {
    updateData.description = null;
  }

  // Handle category clearing
  if (props.body.category === null) {
    updateData.category = null;
  }

  // Handle due_date conversion and clearing
  if (props.body.due_date !== undefined) {
    updateData.due_date = props.body.due_date
      ? new Date(props.body.due_date)
      : null;
  }

  // Handle completed_at conversion and clearing
  if (props.body.completed_at !== undefined) {
    updateData.completed_at = props.body.completed_at
      ? new Date(props.body.completed_at)
      : null;
  }

  // Special handling for completed_at when status changes
  if (props.body.status !== undefined) {
    if (props.body.status === "completed") {
      updateData.completed_at = new Date();
    } else if (existing.status === "completed") {
      updateData.completed_at = null;
    }
  }

  // Update the todo item
  const updated = await MyGlobal.prisma.todo_app_todos.update({
    where: { id: props.todoId },
    data: updateData,
  });

  // Return the updated todo with proper formatting
  return {
    id: updated.id,
    title: updated.title,
    description: updated.description ?? undefined,
    status: typia.assert<"pending" | "in_progress" | "completed" | "cancelled">(
      updated.status,
    ),
    business_status: typia.assert<"active" | "on_hold" | "archived">(
      updated.business_status,
    ),
    priority: typia.assert<"low" | "medium" | "high" | "urgent">(
      updated.priority,
    ),
    category: updated.category ?? undefined,
    due_date: updated.due_date ? toISOStringSafe(updated.due_date) : undefined,
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
