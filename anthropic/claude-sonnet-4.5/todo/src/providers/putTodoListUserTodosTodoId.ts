import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putTodoListUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoListTodo.IUpdate;
}): Promise<ITodoListTodo> {
  // Lookup todo and check user ownership
  const existing = await MyGlobal.prisma.todo_list_todos.findUnique({
    where: { id: props.todoId },
  });

  if (!existing || existing.user_id !== props.user.id) {
    throw new HttpException("Todo not found", 404);
  }

  // Check if user account is active
  const user = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { id: props.user.id },
  });
  if (!user || user.disabled_at) {
    throw new HttpException("User account is disabled", 403);
  }

  // Prepare update data
  const updateData: Record<string, unknown> = {};

  // Title update and uniqueness check
  if (props.body.title !== undefined) {
    // Check uniqueness: user_id+title
    const conflict = await MyGlobal.prisma.todo_list_todos.findFirst({
      where: {
        user_id: props.user.id,
        title: props.body.title,
        id: { not: props.todoId },
      },
    });
    if (conflict) {
      throw new HttpException(
        "A todo with the same title already exists.",
        409,
      );
    }
    updateData.title = props.body.title;
  }

  // Description check (≤500 chars, null allowed)
  if (Object.prototype.hasOwnProperty.call(props.body, "description")) {
    updateData.description =
      props.body.description === undefined ? null : props.body.description;
  }

  // Due date logic (ISO 8601 string or null)
  if (Object.prototype.hasOwnProperty.call(props.body, "due_date")) {
    if (props.body.due_date !== null && props.body.due_date !== undefined) {
      // Compare with now (ISO string)
      const now = new Date();
      const dueDateJs = new Date(props.body.due_date);
      if (dueDateJs.getTime() < now.getTime() - 60000) {
        throw new HttpException("Due date must be now or in the future", 400);
      }
      updateData.due_date = props.body.due_date;
    } else {
      updateData.due_date = null;
    }
  }

  // Status checks and completed_at/deleted_at handling
  let completedAt: string | null | undefined = existing.completed_at
    ? toISOStringSafe(existing.completed_at)
    : null;
  let deletedAt: string | null | undefined = existing.deleted_at
    ? toISOStringSafe(existing.deleted_at)
    : null;

  if (props.body.status !== undefined) {
    if (!["pending", "completed", "deleted"].includes(props.body.status)) {
      throw new HttpException("Invalid status value", 400);
    }
    updateData.status = props.body.status;
    // completed_at and deleted_at logic
    if (props.body.status === "completed") {
      completedAt = toISOStringSafe(new Date());
      updateData.completed_at = completedAt;
    } else if (props.body.status === "deleted") {
      deletedAt = toISOStringSafe(new Date());
      updateData.deleted_at = deletedAt;
    } else {
      if (existing.status === "completed") {
        updateData.completed_at = null;
        completedAt = null;
      }
      if (existing.status === "deleted") {
        updateData.deleted_at = null;
        deletedAt = null;
      }
    }
  }

  // Auto-update timestamp
  updateData.updated_at = toISOStringSafe(new Date());

  let updated;
  try {
    updated = await MyGlobal.prisma.todo_list_todos.update({
      where: { id: props.todoId },
      data: updateData,
    });
  } catch (err: any) {
    if (err.code === "P2002") {
      throw new HttpException("Duplicate title for this user", 409);
    }
    throw new HttpException("Failed to update todo", 400);
  }

  const todoUser = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { id: updated.user_id },
  });
  if (!todoUser) {
    throw new HttpException("User not found", 404);
  }

  return {
    id: updated.id,
    user: {
      id: todoUser.id,
      email: todoUser.email,
      created_at: toISOStringSafe(todoUser.created_at),
      updated_at: toISOStringSafe(todoUser.updated_at),
      disabled_at: todoUser.disabled_at
        ? toISOStringSafe(todoUser.disabled_at)
        : undefined,
    },
    title: updated.title,
    description: updated.description === null ? null : updated.description,
    status: typia.assert<"pending" | "completed" | "deleted">(updated.status),
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
