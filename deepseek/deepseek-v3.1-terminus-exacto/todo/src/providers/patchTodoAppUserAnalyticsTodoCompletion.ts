import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodoAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAnalytics";
import { IDateRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDateRange";
import { IPageITodoAppTodoAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoAnalytics";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPriorityDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IPriorityDistribution";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoAppUserAnalyticsTodoCompletion(props: {
  user: UserPayload;
  body: ITodoAppTodoAnalytics.IRequest;
}): Promise<IPageITodoAppTodoAnalytics> {
  try {
    const {
      date_range,
      status_filters,
      priority_filters,
      completion_patterns,
      page = 1,
      limit = 20,
    } = props.body;

    const skip = (page - 1) * limit;

    // Build base where condition for user isolation and date range
    const baseWhere: any = {
      todo: {
        todo_app_user_id: props.user.id,
        deleted_at: null,
      },
      snapshot_created_at: {
        gte: date_range.start_date,
        lte: date_range.end_date,
      },
    };

    // Apply status filters if provided
    if (status_filters && status_filters.length > 0) {
      baseWhere.todo_app_todo_status_id = {
        in: status_filters,
      };
    }

    // Apply priority filters if provided
    if (priority_filters && priority_filters.length > 0) {
      baseWhere.todo_app_todo_priority_id = {
        in: priority_filters,
      };
    }

    // Get total count for pagination
    const total = await MyGlobal.prisma.todo_app_todo_snapshots.count({
      where: baseWhere,
    });

    // Get paginated snapshots with related data
    const snapshots = await MyGlobal.prisma.todo_app_todo_snapshots.findMany({
      where: baseWhere,
      skip,
      take: limit,
      include: {
        status: true,
        priority: true,
        todo: {
          select: {
            id: true,
            title: true,
            description: true,
            due_date: true,
            created_at: true,
          },
        },
      },
      orderBy: {
        snapshot_created_at: "desc",
      },
    });

    // Filter by completion patterns if specified
    let filteredSnapshots = snapshots;
    if (completion_patterns && completion_patterns.length > 0) {
      filteredSnapshots = snapshots.filter((snapshot) => {
        if (!snapshot.completed_at || !snapshot.todo.created_at) return false;

        // Calculate completion time in days using ISO strings directly
        const completionTimeMs =
          new Date(snapshot.completed_at).getTime() -
          new Date(snapshot.todo.created_at).getTime();
        const completionDays = completionTimeMs / (1000 * 3600 * 24);

        if (completion_patterns.includes("same_day") && completionDays < 1)
          return true;
        if (
          completion_patterns.includes("within_week") &&
          completionDays >= 1 &&
          completionDays <= 7
        )
          return true;
        if (
          completion_patterns.includes("within_month") &&
          completionDays > 7 &&
          completionDays <= 30
        )
          return true;
        if (completion_patterns.includes("extended") && completionDays > 30)
          return true;

        return false;
      });
    }

    // Calculate analytics metrics from filtered snapshots
    const totalTodos = filteredSnapshots.length;
    const completedTodos = filteredSnapshots.filter(
      (s) => s.completed_at !== null,
    ).length;
    const pendingTodos = filteredSnapshots.filter(
      (s) => s.status.code === "pending",
    ).length;
    const inProgressTodos = filteredSnapshots.filter(
      (s) => s.status.code === "in-progress",
    ).length;

    // Calculate overdue todos using current ISO timestamp
    const currentTimestamp = toISOStringSafe(new Date());
    const overdueTodos = filteredSnapshots.filter((s) => {
      if (!s.todo.due_date || s.completed_at !== null) return false;
      // Convert Date to ISO string before comparison
      const dueDateISO = toISOStringSafe(s.todo.due_date);
      return dueDateISO < currentTimestamp;
    }).length;

    // Calculate average completion time
    let totalCompletionTimeMs = 0;
    let completedWithTimeData = 0;

    filteredSnapshots.forEach((snapshot) => {
      if (snapshot.completed_at && snapshot.todo.created_at) {
        const completionTimeMs =
          new Date(snapshot.completed_at).getTime() -
          new Date(snapshot.todo.created_at).getTime();
        totalCompletionTimeMs += completionTimeMs;
        completedWithTimeData++;
      }
    });

    const averageCompletionTimeHours =
      completedWithTimeData > 0
        ? totalCompletionTimeMs / (completedWithTimeData * 3600000) // Convert ms to hours
        : 0;

    // Calculate priority distribution
    const priorityDistribution: IPriorityDistribution = {
      low: filteredSnapshots.filter((s) => s.priority?.code === "low").length,
      medium: filteredSnapshots.filter((s) => s.priority?.code === "medium")
        .length,
      high: filteredSnapshots.filter((s) => s.priority?.code === "high").length,
    };

    // Create single analytics object for the page
    const analyticsData: ITodoAppTodoAnalytics = {
      total_todos: totalTodos,
      completed_todos: completedTodos,
      pending_todos: pendingTodos,
      in_progress_todos: inProgressTodos,
      overdue_todos: overdueTodos,
      average_completion_time_hours: averageCompletionTimeHours,
      priority_distribution: priorityDistribution,
    };

    return {
      data: [analyticsData],
      pagination: {
        current: page,
        limit: limit,
        records: total,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    throw new HttpException(
      "Failed to generate todo completion analytics",
      500,
    );
  }
}
