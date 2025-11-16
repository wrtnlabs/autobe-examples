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

export async function postTodoAppTodoUserTodosTodoIdRestore(props: {
  todoUser: TodouserPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodo> {
  const existing = await MyGlobal.prisma.todo_app_todos.findFirst({
    where: {
      id: props.todoId,
    },
  });

  if (existing === null || existing.deleted_at !== null) {
    throw new HttpException("Todo not found", 404);
  }

  if (existing.todo_user_id !== props.todoUser.id) {
    // Hide existence from non-owner
    throw new HttpException("Todo not found", 404);
  }

  const now = toISOStringSafe(new Date());

  const isCompleted = existing.completed_at !== null;
  let activeStatusId: string | undefined = undefined;

  if (isCompleted) {
    // 1) Prefer ACTIVE code
    const activeByCode = await MyGlobal.prisma.todo_app_todo_statuses.findFirst(
      {
        where: {
          code: "ACTIVE",
          is_active: true,
        },
        orderBy: {
          sort_order: "asc",
        },
      },
    );

    if (activeByCode !== null) {
      activeStatusId = activeByCode.id;
    } else {
      // 2) Fallback to default active
      const activeDefault =
        await MyGlobal.prisma.todo_app_todo_statuses.findFirst({
          where: {
            is_default: true,
            is_active: true,
          },
          orderBy: {
            sort_order: "asc",
          },
        });

      if (activeDefault !== null) {
        activeStatusId = activeDefault.id;
      } else {
        // 3) Any active status
        const anyActive =
          await MyGlobal.prisma.todo_app_todo_statuses.findFirst({
            where: {
              is_active: true,
            },
            orderBy: {
              sort_order: "asc",
            },
          });

        if (anyActive !== null) {
          activeStatusId = anyActive.id;
        }
      }
    }

    if (activeStatusId === undefined) {
      throw new HttpException("No active status available for restore", 400);
    }
  }

  const updated = await MyGlobal.prisma.todo_app_todos.update({
    where: {
      id: props.todoId,
    },
    data: isCompleted
      ? {
          todo_status_id: activeStatusId!,
          completed_at: null,
          updated_at: now,
        }
      : {
          updated_at: now,
        },
  });

  // Fetch status row explicitly using the foreign key
  const statusRow = await MyGlobal.prisma.todo_app_todo_statuses.findFirst({
    where: {
      id: updated.todo_status_id,
    },
  });

  if (statusRow === null) {
    // This should not normally happen if referential integrity is maintained
    throw new HttpException("Todo status not found", 500);
  }

  const result: ITodoAppTodo = {
    id: updated.id,
    title: updated.title,
    description: updated.description ?? null,
    due_date:
      updated.due_date !== null ? toISOStringSafe(updated.due_date) : null,
    status: {
      id: statusRow.id,
      code: statusRow.code,
      label: statusRow.label,
      is_default: statusRow.is_default,
      is_active: statusRow.is_active,
    },
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    completed_at:
      updated.completed_at !== null
        ? toISOStringSafe(updated.completed_at)
        : null,
    deleted_at:
      updated.deleted_at !== null ? toISOStringSafe(updated.deleted_at) : null,
  };

  return result;
}
