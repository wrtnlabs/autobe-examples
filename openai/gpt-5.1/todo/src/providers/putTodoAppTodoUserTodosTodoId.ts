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

export async function putTodoAppTodoUserTodosTodoId(props: {
  todoUser: TodouserPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoAppTodo.IUpdate;
}): Promise<ITodoAppTodo> {
  // 1. Locate the todo belonging to this authenticated todo user
  const existing = await MyGlobal.prisma.todo_app_todos.findFirst({
    where: {
      id: props.todoId,
      // Filter by owning user using the correct foreign key column
      todo_user_id: props.todoUser.id,
      deleted_at: null,
    },
  });

  if (existing === null) {
    // Use 404 to avoid leaking whether another user's todo exists
    throw new HttpException("Todo not found", 404);
  }

  // 2. Determine target status and lifecycle changes if status is updated
  const hasStatusUpdate = props.body.todo_status_id !== undefined;
  const targetStatusId = hasStatusUpdate
    ? props.body.todo_status_id
    : existing.todo_status_id;

  // Load target status to validate and to infer completion semantics
  const targetStatus = await MyGlobal.prisma.todo_app_todo_statuses.findUnique({
    where: {
      id: targetStatusId,
    },
  });

  if (targetStatus === null || targetStatus.is_active !== true) {
    throw new HttpException("Invalid todo status", 400);
  }

  const isTargetCompleted = targetStatus.code === "COMPLETED";

  const currentCompletedAt = existing.completed_at;
  const shouldSetCompletedAt = isTargetCompleted && currentCompletedAt === null;
  const shouldClearCompletedAt =
    !isTargetCompleted && currentCompletedAt !== null;

  // 3. Build update payload inline according to provided fields (partial update)
  const now = new Date();

  const updated = await MyGlobal.prisma.todo_app_todos.update({
    where: {
      id: existing.id,
    },
    data: {
      ...(props.body.title !== undefined && {
        title: props.body.title,
      }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.due_date !== undefined && {
        due_date:
          props.body.due_date === null ? null : new Date(props.body.due_date),
      }),
      ...(hasStatusUpdate && {
        todo_status_id: props.body.todo_status_id,
      }),
      ...(shouldSetCompletedAt && {
        completed_at: now,
      }),
      ...(shouldClearCompletedAt && {
        completed_at: null,
      }),
      updated_at: now,
    },
  });

  // 4. Map DB record to ITodoAppTodo DTO, converting Date objects to ISO strings
  // Note: we never expose Date types directly; all date-time fields use toISOStringSafe.
  return {
    id: updated.id,
    title: updated.title,
    description: updated.description,
    due_date:
      updated.due_date === null ? null : toISOStringSafe(updated.due_date),
    status: {
      id: targetStatus.id,
      code: targetStatus.code,
      label: targetStatus.label,
      is_default: targetStatus.is_default,
      is_active: targetStatus.is_active,
    },
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    completed_at:
      updated.completed_at === null
        ? null
        : toISOStringSafe(updated.completed_at),
    deleted_at:
      updated.deleted_at === null ? null : toISOStringSafe(updated.deleted_at),
  };
}
