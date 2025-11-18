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
  // 1. Find and verify todo exists, belongs to user
  const todo = await MyGlobal.prisma.todo_list_todos.findUnique({
    where: { id: props.todoId },
  });
  if (!todo) {
    throw new HttpException("Todo not found", 404);
  }
  if (todo.todo_list_user_id !== props.user.id) {
    throw new HttpException("Forbidden: Only owner can update this todo", 403);
  }

  // 2. Build update data and enforce individual field rules
  const update: Record<string, unknown> = {};

  // Title: 1–100 chars, non-whitespace (already validated by DTO layer)
  if (props.body.title !== undefined) {
    update.title = props.body.title;
  }

  // Description: string or null, max 1000 (already validated)
  if (Object.prototype.hasOwnProperty.call(props.body, "description")) {
    update.description =
      props.body.description === undefined ? null : props.body.description;
  }

  // Due_date: ISO8601 in the future, or null (already validated)
  if (Object.prototype.hasOwnProperty.call(props.body, "due_date")) {
    update.due_date =
      props.body.due_date === undefined ? null : props.body.due_date;
  }

  // Status with lifecycle & completed_at
  let shouldSetCompletedAt = false;
  if (props.body.status !== undefined) {
    // Only allow permitted transitions (from current to next)
    const current = todo.status;
    const next = props.body.status;
    const allowed: Record<string, string[]> = {
      pending: ["pending", "completed", "archived"],
      completed: ["completed", "archived"],
      archived: ["archived"],
    };
    if (!allowed[current] || !allowed[current].includes(next)) {
      throw new HttpException("Invalid status transition", 400);
    }
    update.status = next;
    if (current !== "completed" && next === "completed") {
      shouldSetCompletedAt = true; // Only set when transitioning to completed
    }
    // Clear completed_at if transitioning away from completed
    if (current === "completed" && next !== "completed") {
      update.completed_at = null;
    }
  }

  // completed_at: Set when status transitions to completed
  if (shouldSetCompletedAt) {
    update.completed_at = toISOStringSafe(new Date());
  }

  // Always update updated_at
  update.updated_at = toISOStringSafe(new Date());

  // Perform update
  const updated = await MyGlobal.prisma.todo_list_todos.update({
    where: { id: props.todoId },
    data: update,
  });

  // Return in API format, mapping null/undefined properly per ITodoListTodo
  return {
    id: updated.id,
    title: updated.title,
    description: Object.prototype.hasOwnProperty.call(updated, "description")
      ? updated.description
      : undefined,
    status: typia.assert<"pending" | "completed" | "archived">(updated.status),
    due_date:
      Object.prototype.hasOwnProperty.call(updated, "due_date") &&
      updated.due_date !== null
        ? toISOStringSafe(updated.due_date)
        : updated.due_date === null
          ? null
          : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    completed_at:
      Object.prototype.hasOwnProperty.call(updated, "completed_at") &&
      updated.completed_at !== null
        ? toISOStringSafe(updated.completed_at)
        : updated.completed_at === null
          ? null
          : undefined,
    todo_list_user_id: updated.todo_list_user_id,
  };
}
