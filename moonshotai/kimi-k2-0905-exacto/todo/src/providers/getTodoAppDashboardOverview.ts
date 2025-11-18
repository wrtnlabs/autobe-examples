import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppDashboard";
import { ITodoAppCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppCategory";

export async function getTodoAppDashboardOverview(): Promise<ITodoAppDashboard.IOverview> {
  const now = new Date();
  const today = toISOStringSafe(
    new Date(now.getFullYear(), now.getMonth(), now.getDate()),
  );
  const weekFromNow = toISOStringSafe(
    new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
  );
  const weekStart = toISOStringSafe(
    new Date(now.getTime() - now.getDay() * 24 * 60 * 60 * 1000),
  );
  const monthStart = toISOStringSafe(
    new Date(now.getFullYear(), now.getMonth(), 1),
  );
  const tomorrow = toISOStringSafe(
    new Date(now.getTime() + 24 * 60 * 60 * 1000),
  );

  // Get category data first to build lookup map
  const categories = await MyGlobal.prisma.todo_app_categories.findMany();
  const categoryMap = new Map(categories.map((cat) => [cat.id, cat]));

  // Calculate core task statistics
  const allTasks = await MyGlobal.prisma.todo_app_tasks.findMany({
    include: { category: true },
  });

  const completedTasksList =
    await MyGlobal.prisma.todo_app_task_completions.findMany({
      include: { task: { include: { category: true } } },
      orderBy: { completed_at: "desc" },
      take: 10,
    });

  // Calculate task counts
  let activeTasks = 0;
  let completedTasks = 0;
  let pendingTasks = 0;
  let inProgressTasks = 0;
  let highPriorityTasks = 0;
  let mediumPriorityTasks = 0;
  let lowPriorityTasks = 0;
  let tasksWithDueDate = 0;
  let overdueTasks = 0;
  let todayDueTasks = 0;
  let weekDueTasks = 0;

  const categoryStats = new Map<
    string,
    { active: number; completed: number; total: number }
  >();

  // Process all tasks
  for (const task of allTasks) {
    // Status counts
    if (task.status === "completed") {
      completedTasks++;
    } else if (task.status === "pending") {
      pendingTasks++;
      activeTasks++;
    } else if (task.status === "in-progress") {
      inProgressTasks++;
      activeTasks++;
    }

    // Priority counts
    if (task.priority === "High") {
      highPriorityTasks++;
    } else if (task.priority === "Medium") {
      mediumPriorityTasks++;
    } else {
      lowPriorityTasks++;
    }

    // Due date analysis
    if (task.due_date) {
      tasksWithDueDate++;
      const dueDate = new Date(task.due_date);
      const taskStatus = task.status;

      if (taskStatus !== "completed" && dueDate < now) {
        overdueTasks++;
      }

      if (
        taskStatus !== "completed" &&
        dueDate >= new Date(today) &&
        dueDate < new Date(tomorrow)
      ) {
        todayDueTasks++;
      }

      if (
        taskStatus !== "completed" &&
        dueDate >= new Date(today) &&
        dueDate <= new Date(weekFromNow)
      ) {
        weekDueTasks++;
      }
    }

    // Category statistics
    if (task.category) {
      const stats = categoryStats.get(task.category.id) || {
        active: 0,
        completed: 0,
        total: 0,
      };
      stats.total++;

      if (task.status === "completed") {
        stats.completed++;
      } else {
        stats.active++;
      }

      categoryStats.set(task.category.id, stats);
    }
  }

  const totalTasks = allTasks.length;
  const overallCompletionRate =
    totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  // Calculate time-based completion rates
  const weekStartDate = new Date(weekStart);
  const monthStartDate = new Date(monthStart);

  const thisWeekCompleted = completedTasksList.filter(
    (comp) => new Date(comp.completed_at) >= weekStartDate,
  ).length;

  const thisMonthCompleted = completedTasksList.filter(
    (comp) => new Date(comp.completed_at) >= monthStartDate,
  ).length;

  const thisWeekCreated = allTasks.filter(
    (task) => new Date(task.created_at) >= weekStartDate,
  ).length;

  const thisMonthCreated = allTasks.filter(
    (task) => new Date(task.created_at) >= monthStartDate,
  ).length;

  const thisWeekCompletionRate =
    thisWeekCreated > 0
      ? (thisWeekCompleted / (thisWeekCreated + completedTasks)) * 100
      : 0;
  const thisMonthCompletionRate =
    thisMonthCreated > 0
      ? (thisMonthCompleted / (thisMonthCreated + completedTasks)) * 100
      : 0;

  // Calculate average time to completion
  const completionSummaries = completedTasksList
    .slice(0, 50)
    .filter((comp) => comp.completed_at && comp.task.created_at);

  const averageTimeToCompletion =
    completionSummaries.length > 0
      ? completionSummaries.reduce((sum, comp) => {
          const hours =
            (new Date(comp.completed_at).getTime() -
              new Date(comp.task.created_at).getTime()) /
            (1000 * 60 * 60);
          return sum + Math.max(0, hours);
        }, 0) /
        completionSummaries.length /
        24
      : undefined;

  // Build category counts
  const categoryCounts: ITodoAppDashboard.ICategoryCount[] = Array.from(
    categoryStats.entries(),
  ).map(([categoryId, stats]) => {
    const category = categoryMap.get(categoryId)!;
    const completionRate =
      stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;

    return {
      category: {
        id: category.id as string & tags.Format<"uuid">,
        name: category.name,
        description: category.description,
        created_at: toISOStringSafe(category.created_at),
        updated_at: toISOStringSafe(category.updated_at),
      },
      active_tasks_count: stats.active,
      completed_tasks_count: stats.completed,
      completion_rate: Math.round(completionRate * 100) / 100,
    };
  });

  // Build recent completions
  const recentCompletions: ITodoAppDashboard.IRecentCompletion[] =
    completedTasksList.map((completion) => {
      const hours =
        (new Date(completion.completed_at).getTime() -
          new Date(completion.task.created_at).getTime()) /
        (1000 * 60 * 60);

      return {
        id: completion.id as string & tags.Format<"uuid">,
        task_id: completion.todo_app_task_id as string & tags.Format<"uuid">,
        title: completion.task.title,
        category: completion.task.category
          ? {
              id: completion.task.category.id as string & tags.Format<"uuid">,
              name: completion.task.category.name,
              description: completion.task.category.description,
              created_at: toISOStringSafe(completion.task.category.created_at),
              updated_at: toISOStringSafe(completion.task.category.updated_at),
            }
          : null,
        priority: completion.task.priority as "Low" | "Medium" | "High",
        completed_at: toISOStringSafe(completion.completed_at),
        time_to_completion_hours: Math.round(Math.max(0, hours)),
      };
    });

  return {
    active_tasks_count: activeTasks,
    completed_tasks_count: completedTasks,
    pending_tasks_count: pendingTasks,
    in_progress_tasks_count: inProgressTasks,
    high_priority_tasks_count: highPriorityTasks,
    medium_priority_tasks_count: mediumPriorityTasks,
    low_priority_tasks_count: lowPriorityTasks,
    tasks_with_due_date_count: tasksWithDueDate,
    overdue_tasks_count: overdueTasks,
    today_due_tasks_count: todayDueTasks,
    week_due_tasks_count: weekDueTasks,
    task_completion_rate: Math.round(overallCompletionRate * 100) / 100,
    this_week_completion_rate: Math.round(thisWeekCompletionRate * 100) / 100,
    this_month_completion_rate: Math.round(thisMonthCompletionRate * 100) / 100,
    average_time_to_completion_days: averageTimeToCompletion
      ? Math.round(averageTimeToCompletion * 100) / 100
      : undefined,
    category_counts: categoryCounts,
    recent_completions: recentCompletions,
  };
}
