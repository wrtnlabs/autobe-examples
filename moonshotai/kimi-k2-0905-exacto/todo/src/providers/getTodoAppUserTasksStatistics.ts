import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTaskStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskStatistics";
import { ITodoAppTaskMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskMetric";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoAppUserTasksStatistics(props: {
  user: UserPayload;
}): Promise<ITodoAppTaskStatistics> {
  // Get current date for comparison
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Get all tasks for the user (including deleted for total count)
  const allTasks = await MyGlobal.prisma.todo_app_tasks.findMany({
    where: {
      todo_app_user_id: props.user.id,
    },
    select: {
      status: true,
      priority: true,
      due_date: true,
      created_at: true,
      completed_at: true,
      deleted_at: true,
    },
  });

  const activeTasks = allTasks.filter((task) => task.deleted_at === null);

  // Calculate all statistics from the data
  const totalTasksCount = allTasks.length;
  const activeTasksCount = activeTasks.length;
  const pendingTasksCount = activeTasks.filter(
    (task) => task.status === "pending",
  ).length;
  const completedTasksCount = activeTasks.filter(
    (task) => task.status === "completed",
  ).length;

  // Calculate completion rate
  const completionRate =
    activeTasksCount > 0 ? completedTasksCount / activeTasksCount : 0;

  // Count by priority
  const highPriorityCount = activeTasks.filter(
    (task) => task.priority === "high",
  ).length;
  const mediumPriorityCount = activeTasks.filter(
    (task) => task.priority === "medium",
  ).length;
  const lowPriorityCount = activeTasks.filter(
    (task) => task.priority === "low",
  ).length;
  const noPriorityCount = activeTasks.filter(
    (task) => task.priority === null,
  ).length;

  // Count overdue and due-date related
  const overdueTasksCount = activeTasks.filter(
    (task) =>
      task.status === "pending" &&
      task.due_date !== null &&
      new Date(task.due_date) < now,
  ).length;

  const dueTodayCount = activeTasks.filter((task) => {
    if (task.status !== "pending" || !task.due_date) return false;
    const dueDate = new Date(task.due_date);
    return (
      dueDate >= today &&
      dueDate < new Date(today.getTime() + 24 * 60 * 60 * 1000)
    );
  }).length;

  const dueThisWeekCount = activeTasks.filter((task) => {
    if (task.status !== "pending" || !task.due_date) return false;
    const dueDate = new Date(task.due_date);
    return dueDate >= today && dueDate < nextWeek;
  }).length;

  // Monthly activity
  const tasksCreatedThisMonthCount = activeTasks.filter(
    (task) => new Date(task.created_at) >= startOfMonth,
  ).length;

  const tasksCompletedThisMonthCount = activeTasks.filter(
    (task) =>
      task.status === "completed" &&
      task.completed_at !== null &&
      new Date(task.completed_at) >= startOfMonth,
  ).length;

  // Calculate average completion time
  const completedTasks = activeTasks.filter(
    (task) => task.status === "completed" && task.completed_at !== null,
  );

  let averageCompletionTime = 0;
  if (completedTasks.length > 0) {
    const totalDays = completedTasks.reduce((sum, task) => {
      const diffMs =
        new Date(task.completed_at!).getTime() -
        new Date(task.created_at).getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      return sum + diffDays;
    }, 0);

    averageCompletionTime = totalDays / completedTasks.length;
  }

  // Helper function to ensure proper int32 typing
  const toMetricValue = (
    value: number,
  ): number & tags.Type<"int32"> & tags.Minimum<0> => {
    const intValue = Math.floor(value);
    return typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
      intValue >= 0 ? intValue : 0,
    );
  };

  return {
    total_tasks: {
      value: toMetricValue(totalTasksCount),
    },
    active_tasks: {
      value: toMetricValue(activeTasksCount),
    },
    pending_tasks: {
      value: toMetricValue(pendingTasksCount),
    },
    completed_tasks: {
      value: toMetricValue(completedTasksCount),
    },
    completion_rate: {
      value: toMetricValue(completionRate * 100),
    },
    high_priority_tasks: {
      value: toMetricValue(highPriorityCount),
    },
    medium_priority_tasks: {
      value: toMetricValue(mediumPriorityCount),
    },
    low_priority_tasks: {
      value: toMetricValue(lowPriorityCount),
    },
    no_priority_tasks: {
      value: toMetricValue(noPriorityCount),
    },
    overdue_tasks: {
      value: toMetricValue(overdueTasksCount),
    },
    due_today_tasks: {
      value: toMetricValue(dueTodayCount),
    },
    due_this_week_tasks: {
      value: toMetricValue(dueThisWeekCount),
    },
    tasks_created_this_month: {
      value: toMetricValue(tasksCreatedThisMonthCount),
    },
    tasks_completed_this_month: {
      value: toMetricValue(tasksCompletedThisMonthCount),
    },
    average_completion_time_days: {
      value: toMetricValue(averageCompletionTime),
    },
  };
}
