import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";
import { TodouserPayload } from "../decorators/payload/TodouserPayload";

export async function postTodoAppTodoUserTodosTodoIdComplete(props: {
  todoUser: TodouserPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodo> {
  const { todoUser, todoId } = props;

  // 1. Locate todo owned by this user and not soft-deleted
  const existing = await MyGlobal.prisma.todo_app_todos.findFirst({
    where: {
      id: todoId,
      todo_user_id: todoUser.id,
      deleted_at: null,
    },
  });

  if (existing === null) {
    // Do not leak cross-user existence information
    throw new HttpException("Todo not found", 404);
  }

  // 2. Resolve COMPLETED status from catalogue
  const completedStatus =
    await MyGlobal.prisma.todo_app_todo_statuses.findFirst({
      where: {
        code: "COMPLETED",
        is_active: true,
      },
      orderBy: {
        sort_order: "asc",
      },
    });

  if (completedStatus === null) {
    // Misconfiguration: no active COMPLETED status available
    throw new HttpException("Completed status is not configured", 400);
  }

  // 3. Idempotent behavior: already completed with this status
  if (
    existing.todo_status_id === completedStatus.id &&
    existing.completed_at !== null
  ) {
    return {
      id: existing.id,
      title: existing.title,
      description: existing.description ?? null,
      due_date:
        existing.due_date !== null ? toISOStringSafe(existing.due_date) : null,
      status: {
        id: completedStatus.id,
        code: completedStatus.code,
        label: completedStatus.label,
        is_default: completedStatus.is_default,
        is_active: completedStatus.is_active,
      },
      created_at: toISOStringSafe(existing.created_at),
      updated_at: toISOStringSafe(existing.updated_at),
      completed_at:
        existing.completed_at !== null
          ? toISOStringSafe(existing.completed_at)
          : null,
      deleted_at:
        existing.deleted_at !== null
          ? toISOStringSafe(existing.deleted_at)
          : null,
    };
  }

  // 4. Perform completion update
  const now = new Date();

  const updated = await MyGlobal.prisma.todo_app_todos.update({
    where: {
      id: todoId,
    },
    data: {
      todo_status_id: completedStatus.id,
      completed_at: now,
      updated_at: now,
    },
  });

  if (updated.completed_at === null) {
    // This should never happen if the update above succeeds
    throw new HttpException("Todo completion state is inconsistent", 500);
  }

  return {
    id: updated.id,
    title: updated.title,
    description: updated.description ?? null,
    due_date:
      updated.due_date !== null ? toISOStringSafe(updated.due_date) : null,
    status: {
      id: completedStatus.id,
      code: completedStatus.code,
      label: completedStatus.label,
      is_default: completedStatus.is_default,
      is_active: completedStatus.is_active,
    },
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    completed_at: toISOStringSafe(updated.completed_at),
    deleted_at:
      updated.deleted_at !== null ? toISOStringSafe(updated.deleted_at) : null,
  };
}
