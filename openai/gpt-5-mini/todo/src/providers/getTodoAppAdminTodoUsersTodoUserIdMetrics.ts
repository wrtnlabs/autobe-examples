import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppUserMetrics } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserMetrics";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getTodoAppAdminTodoUsersTodoUserIdMetrics(props: {
  admin: AdminPayload;
  todoUserId: string & tags.Format<"uuid">;
}): Promise<ITodoAppUserMetrics> {
  const { admin, todoUserId } = props;

  try {
    // Verify user exists
    const user = await MyGlobal.prisma.todo_app_todouser.findUnique({
      where: { id: todoUserId },
      select: { id: true },
    });

    if (!user) throw new HttpException("Not Found", 404);

    // Current timestamp to use for audit and response
    const now = toISOStringSafe(new Date());

    // Aggregate counts (exclude soft-deleted rows)
    const totalTasks = await MyGlobal.prisma.todo_app_tasks.count({
      where: {
        deleted_at: null,
        list: { todo_app_todouser_id: todoUserId },
      },
    });

    const completedTasksCount = await MyGlobal.prisma.todo_app_tasks.count({
      where: {
        deleted_at: null,
        is_completed: true,
        list: { todo_app_todouser_id: todoUserId },
      },
    });

    const overdueTasksCount = await MyGlobal.prisma.todo_app_tasks.count({
      where: {
        deleted_at: null,
        is_completed: false,
        due_date: { lt: now },
        list: { todo_app_todouser_id: todoUserId },
      },
    });

    const activeListsCount = await MyGlobal.prisma.todo_app_lists.count({
      where: { todo_app_todouser_id: todoUserId, deleted_at: null },
    });

    // Use snapshots where both timestamps exist and task/list are active
    const snapshots = await MyGlobal.prisma.todo_app_task_snapshots.findMany({
      where: {
        completed_at: { not: null },
        original_created_at: { not: null },
        task: { deleted_at: null, list: { todo_app_todouser_id: todoUserId } },
      },
      select: { completed_at: true, original_created_at: true },
    });

    let averageTimeToCompleteSeconds: number | null = null;
    if (snapshots.length > 0) {
      const totalSeconds = snapshots.reduce((acc, s) => {
        // s.completed_at and s.original_created_at are guaranteed non-null by the query
        const completedIso = toISOStringSafe(
          s.completed_at as unknown as
            | Date
            | (string & tags.Format<"date-time">),
        );
        const originalIso = toISOStringSafe(
          s.original_created_at as unknown as
            | Date
            | (string & tags.Format<"date-time">),
        );
        const deltaSeconds =
          (Date.parse(completedIso) - Date.parse(originalIso)) / 1000;
        return acc + Math.max(0, deltaSeconds);
      }, 0);
      averageTimeToCompleteSeconds = totalSeconds / snapshots.length;
    }

    // Last activity timestamp
    const lastActivity =
      await MyGlobal.prisma.todo_app_user_activity_logs.findFirst({
        where: { todo_app_todouser_id: todoUserId, deleted_at: null },
        orderBy: { created_at: "desc" },
        select: { created_at: true },
      });
    const lastActiveAt = lastActivity
      ? toISOStringSafe(
          lastActivity.created_at as unknown as
            | Date
            | (string & tags.Format<"date-time">),
        )
      : null;

    // Completion rate
    const completionRate =
      totalTasks === 0 ? 0 : completedTasksCount / totalTasks;

    // Record audit log (admin access)
    await MyGlobal.prisma.todo_app_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        todo_app_admin_id: admin.id,
        todo_app_admin_session_id: admin.session_id,
        todo_app_todouser_id: todoUserId,
        event_type: "metrics_view",
        details: null,
        ip: null,
        href: null,
        user_agent: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

    return {
      todoUserId,
      totalTasks: totalTasks,
      activeListsCount: activeListsCount,
      completedTasksCount: completedTasksCount,
      overdueTasksCount: overdueTasksCount,
      completionRate,
      averageTimeToCompleteSeconds,
      lastActiveAt,
      computedAt: now,
    };
  } catch (err) {
    if (err instanceof HttpException) throw err;
    throw new HttpException("Internal Server Error", 500);
  }
}
