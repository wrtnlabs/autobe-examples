import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppUserMetrics } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserMetrics";
import { TodouserPayload } from "../decorators/payload/TodouserPayload";

export async function getTodoAppTodoUserTodoUsersTodoUserIdMetrics(props: {
  todoUser: TodouserPayload;
  todoUserId: string & tags.Format<"uuid">;
}): Promise<ITodoAppUserMetrics> {
  const { todoUser, todoUserId } = props;

  // Authorization: requesting user must be the owner (or admin - admin not present in payload)
  if (todoUser.id !== todoUserId) {
    throw new HttpException(
      "Unauthorized: only the owner may access these metrics",
      403,
    );
  }

  // Verify target user exists and is not soft-deleted
  const targetUser = await MyGlobal.prisma.todo_app_todouser.findUnique({
    where: { id: todoUserId },
  });
  if (!targetUser || targetUser.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }

  // Current timestamp for comparisons and response
  const now = toISOStringSafe(new Date());

  // Aggregate counts in parallel
  const [totalTasks, completedTasksCount, overdueTasksCount, activeListsCount] =
    await Promise.all([
      MyGlobal.prisma.todo_app_tasks.count({
        where: {
          deleted_at: null,
          list: { todo_app_todouser_id: todoUserId },
        },
      }),

      MyGlobal.prisma.todo_app_tasks.count({
        where: {
          deleted_at: null,
          is_completed: true,
          list: { todo_app_todouser_id: todoUserId },
        },
      }),

      MyGlobal.prisma.todo_app_tasks.count({
        where: {
          deleted_at: null,
          is_completed: false,
          due_date: { lt: now },
          list: { todo_app_todouser_id: todoUserId },
        },
      }),

      MyGlobal.prisma.todo_app_lists.count({
        where: {
          todo_app_todouser_id: todoUserId,
          deleted_at: null,
        },
      }),
    ]);

  // Average time to complete (seconds) computed from snapshots
  const snapshots = await MyGlobal.prisma.todo_app_task_snapshots.findMany({
    where: {
      completed_at: { not: null },
      original_created_at: { not: null },
      task: {
        deleted_at: null,
        list: { todo_app_todouser_id: todoUserId },
      },
    },
    select: {
      completed_at: true,
      original_created_at: true,
    },
  });

  let sumSeconds = 0;
  let durationCount = 0;
  for (const s of snapshots) {
    if (s.completed_at && s.original_created_at) {
      const completedMs = Number(s.completed_at);
      const originalMs = Number(s.original_created_at);
      const diffMs = completedMs - originalMs;
      if (diffMs >= 0) {
        sumSeconds += diffMs / 1000;
        durationCount += 1;
      }
    }
  }

  const averageTimeToCompleteSeconds =
    durationCount > 0 ? sumSeconds / durationCount : null;

  // Last activity
  const lastActivity =
    await MyGlobal.prisma.todo_app_user_activity_logs.findFirst({
      where: {
        todo_app_todouser_id: todoUserId,
        deleted_at: null,
      },
      orderBy: { created_at: "desc" },
      select: { created_at: true },
    });

  const lastActiveAt = lastActivity
    ? toISOStringSafe(lastActivity.created_at)
    : null;

  // Record audit log for metrics access
  await MyGlobal.prisma.todo_app_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_app_todouser_id: todoUser.id,
      todo_app_todouser_session_id: todoUser.session_id,
      event_type: "metrics_view",
      target_type: "todo_user",
      target_id: todoUserId,
      created_at: now,
      updated_at: now,
    },
  });

  const completionRate =
    totalTasks === 0 ? 0 : completedTasksCount / totalTasks;

  return {
    todoUserId,
    totalTasks,
    activeListsCount,
    completedTasksCount,
    overdueTasksCount,
    completionRate,
    averageTimeToCompleteSeconds,
    lastActiveAt,
    computedAt: now,
  };
}
