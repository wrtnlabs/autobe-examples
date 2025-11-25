import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoAppUserTodosBulk(props: {
  user: UserPayload;
  body: ITodoAppTodo.IBulkUpdate;
}): Promise<ITodoAppTodo.IBulkUpdateResult> {
  const { user, body } = props;
  const { ids, update } = body;
  const now = toISOStringSafe(new Date());

  // Load all candidate todos (omit soft-deleted)
  const todos = await MyGlobal.prisma.todo_app_todos.findMany({
    where: {
      id: { in: ids },
      todo_app_user_id: user.id,
      deleted_at: null,
    },
  });
  const todosById = new Map<string, (typeof todos)[0]>(
    todos.map((todo) => [todo.id, todo]),
  );

  // Gather per-item update results and mutation targets
  const results: ITodoAppTodo.IBulkUpdateResultItem[] = [];
  const dbUpdates: { id: string; data: Record<string, unknown> }[] = [];
  for (let idx = 0; idx < ids.length; idx++) {
    const id = ids[idx];
    const todo = todosById.get(id);
    if (!todo) {
      results.push({
        id,
        success: false,
        error: "Todo not found or not owned.",
      });
      continue;
    }
    let error: string | null = null;
    let patch: Record<string, unknown> = {};

    // Title uniqueness (only for active todos, if title update is requested)
    if (update.title !== undefined) {
      const existing = await MyGlobal.prisma.todo_app_todos.findFirst({
        where: {
          todo_app_user_id: user.id,
          status: "active",
          title: update.title,
          id: { not: id },
          deleted_at: null,
        },
        select: { id: true },
      });
      if (existing) {
        results.push({
          id,
          success: false,
          error: "Title already exists among your active todos.",
        });
        continue;
      } else {
        patch.title = update.title;
      }
    }
    // Description update
    if (update.description !== undefined) {
      patch.description = update.description ?? null;
    }
    // Due date update
    if (update.due_date !== undefined) {
      patch.due_date = update.due_date ?? null;
    }
    // Status update
    if (update.status !== undefined) {
      const currentStatus = todo.status;
      const nextStatus = update.status;
      if (currentStatus === nextStatus) {
        // No change
      } else if (currentStatus === "deleted") {
        results.push({
          id,
          success: false,
          error: "Cannot update a deleted todo.",
        });
        continue;
      } else if (nextStatus === "active") {
        patch.status = "active";
        patch.completed_at = null;
        patch.deleted_at = null;
      } else if (nextStatus === "completed" && currentStatus === "active") {
        patch.status = "completed";
        patch.completed_at = now;
        patch.deleted_at = null;
      } else if (nextStatus === "deleted" && currentStatus !== "deleted") {
        patch.status = "deleted";
        patch.deleted_at = now;
      } else {
        results.push({
          id,
          success: false,
          error: "Invalid status transition.",
        });
        continue;
      }
    }
    if (Object.keys(patch).length > 0) {
      patch.updated_at = now;
      dbUpdates.push({ id, data: patch });
      results.push({
        id,
        success: true,
        error: null,
      });
    } else {
      results.push({
        id,
        success: false,
        error: "No valid update fields provided.",
      });
    }
  }

  // Batch DB updates inside a transaction: atomic, but only for those marked as updatable
  if (dbUpdates.length > 0) {
    await MyGlobal.prisma.$transaction(
      dbUpdates.map((u) =>
        MyGlobal.prisma.todo_app_todos.update({
          where: { id: u.id },
          data: u.data,
        }),
      ),
    );
  }
  return { results };
}
