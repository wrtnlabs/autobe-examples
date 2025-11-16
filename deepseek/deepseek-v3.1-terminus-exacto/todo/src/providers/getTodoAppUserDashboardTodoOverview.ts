import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodoDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoDashboard";
import { IPriorityDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IPriorityDistribution";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoAppUserDashboardTodoOverview(props: {
  user: UserPayload;
}): Promise<ITodoAppTodoDashboard> {
  const userId = props.user.id;
  const now = toISOStringSafe(new Date());
  const sevenDaysAgo = toISOStringSafe(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  );
  const sevenDaysLater = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  // Get active status and priority codes
  const [statuses, priorities] = await Promise.all([
    MyGlobal.prisma.todo_app_todo_statuses.findMany({
      where: { is_active: true },
    }),
    MyGlobal.prisma.todo_app_todo_priorities.findMany({
      where: { is_active: true },
    }),
  ]);

  const statusMap = statuses.reduce(
    (acc, status) => {
      acc[status.code] = status.id;
      return acc;
    },
    {} as Record<string, string>,
  );

  const priorityMap = priorities.reduce(
    (acc, priority) => {
      acc[priority.code] = priority.id;
      return acc;
    },
    {} as Record<string, string>,
  );

  // Verify required status codes exist
  if (!statusMap.pending || !statusMap["in-progress"] || !statusMap.completed) {
    throw new HttpException("Required todo status codes not found", 500);
  }

  // Base where condition for user's active todos
  const baseWhere = {
    todo_app_user_id: userId,
    deleted_at: null,
  };

  // Execute all metric queries concurrently
  const [
    totalTodos,
    completedTodos,
    pendingTodos,
    inProgressTodos,
    overdueTodos,
    priorityDistribution,
    recentCompletions,
    upcomingDueDates,
    averageCompletionData,
  ] = await Promise.all([
    // Total todos
    MyGlobal.prisma.todo_app_todos.count({ where: baseWhere }),

    // Completed todos
    MyGlobal.prisma.todo_app_todo_lifecycles.count({
      where: {
        todo: baseWhere,
        currentSnapshot: {
          todo_app_todo_status_id: statusMap.completed,
        },
      },
    }),

    // Pending todos
    MyGlobal.prisma.todo_app_todo_lifecycles.count({
      where: {
        todo: baseWhere,
        currentSnapshot: {
          todo_app_todo_status_id: statusMap.pending,
        },
      },
    }),

    // In-progress todos
    MyGlobal.prisma.todo_app_todo_lifecycles.count({
      where: {
        todo: baseWhere,
        currentSnapshot: {
          todo_app_todo_status_id: statusMap["in-progress"],
        },
      },
    }),

    // Overdue todos - simplified approach
    MyGlobal.prisma.todo_app_todos.count({
      where: {
        ...baseWhere,
        due_date: {
          lt: now,
        },
      },
    }),

    // Priority distribution - simplified approach
    MyGlobal.prisma.todo_app_todo_lifecycles
      .findMany({
        where: {
          todo: baseWhere,
        },
        include: {
          currentSnapshot: {
            include: {
              priority: true,
            },
          },
        },
      })
      .then((lifecycles) => {
        const distribution: IPriorityDistribution = {
          low: 0,
          medium: 0,
          high: 0,
        };

        lifecycles.forEach((lifecycle) => {
          const priorityCode = lifecycle.currentSnapshot?.priority?.code;
          if (priorityCode === "low") distribution.low++;
          else if (priorityCode === "medium") distribution.medium++;
          else if (priorityCode === "high") distribution.high++;
        });

        return distribution;
      }),

    // Recent completions (last 7 days) - simplified
    MyGlobal.prisma.todo_app_todo_snapshots.count({
      where: {
        todo_app_todo_status_id: statusMap.completed,
        snapshot_created_at: {
          gte: sevenDaysAgo,
        },
      },
    }),

    // Upcoming due dates (next 7 days) - simplified
    MyGlobal.prisma.todo_app_todos.count({
      where: {
        ...baseWhere,
        due_date: {
          gte: now,
          lte: sevenDaysLater,
        },
      },
    }),

    // Average completion time data - simplified
    MyGlobal.prisma.todo_app_todo_snapshots
      .findMany({
        where: {
          todo_app_todo_status_id: statusMap.completed,
        },
        select: {
          snapshot_created_at: true,
          todo_app_todo_id: true,
        },
      })
      .then(async (snapshots) => {
        if (snapshots.length === 0) return { totalHours: 0, count: 0 };

        let totalHours = 0;

        // Get creation times for each todo
        const todoIds = snapshots.map((s) => s.todo_app_todo_id);
        const todos = await MyGlobal.prisma.todo_app_todos.findMany({
          where: { id: { in: todoIds } },
          select: { id: true, created_at: true },
        });

        const todoMap = todos.reduce(
          (acc, todo) => {
            acc[todo.id] = todo.created_at;
            return acc;
          },
          {} as Record<string, Date>,
        );

        snapshots.forEach((snapshot) => {
          const completionTime = new Date(
            snapshot.snapshot_created_at,
          ).getTime();
          const creationTime = new Date(
            todoMap[snapshot.todo_app_todo_id],
          ).getTime();
          const hours = (completionTime - creationTime) / (1000 * 60 * 60);
          totalHours += hours;
        });

        return { totalHours, count: snapshots.length };
      }),
  ]);

  // Calculate completion rate
  const completionRate =
    totalTodos > 0 ? (completedTodos / totalTodos) * 100 : 0;

  // Calculate average completion time
  const averageCompletionTimeHours =
    averageCompletionData.count > 0
      ? averageCompletionData.totalHours / averageCompletionData.count
      : 0;

  return {
    total_todos: totalTodos,
    completed_todos: completedTodos,
    pending_todos: pendingTodos,
    in_progress_todos: inProgressTodos,
    overdue_todos: overdueTodos,
    priority_distribution: priorityDistribution,
    completion_rate: completionRate,
    average_completion_time_hours: averageCompletionTimeHours,
    recent_completions: recentCompletions,
    upcoming_due_dates: upcomingDueDates,
  };
}
