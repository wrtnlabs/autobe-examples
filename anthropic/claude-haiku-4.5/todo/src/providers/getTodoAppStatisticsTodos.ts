import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodoStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatistics";
import { ITodoCreationTrendDay } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoCreationTrendDay";
import { ITodoCompletionTrendDay } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoCompletionTrendDay";

export async function getTodoAppStatisticsTodos(): Promise<ITodoAppTodoStatistics> {
  const nowString = toISOStringSafe(new Date());
  const now = new Date();

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayString = today.toISOString().split("T")[0];

  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoString = sevenDaysAgo.toISOString().split("T")[0];

  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoString = thirtyDaysAgo.toISOString().split("T")[0];

  // Execute all queries in parallel
  const [
    totalTodos,
    completedTodos,
    incompleteTodos,
    totalUsers,
    todosForAnalysis,
    userTodosCounts,
  ] = await Promise.all([
    // Total todos count
    MyGlobal.prisma.todo_app_todo.count(),

    // Completed todos count
    MyGlobal.prisma.todo_app_todo.count({
      where: { is_completed: true },
    }),

    // Incomplete todos count
    MyGlobal.prisma.todo_app_todo.count({
      where: { is_completed: false },
    }),

    // Total active users
    MyGlobal.prisma.todo_app_user.count({
      where: { deleted_at: null },
    }),

    // All todos for trend and temporal analysis
    MyGlobal.prisma.todo_app_todo.findMany({
      select: {
        created_at: true,
        completed_at: true,
        is_completed: true,
      },
    }),

    // Count todos per user for median
    MyGlobal.prisma.todo_app_todo.groupBy({
      by: ["todo_app_user_id"],
      _count: true,
    }),
  ]);

  // Extract date strings from todos
  const createdDates = todosForAnalysis.map((t) => {
    const createdDate =
      t.created_at instanceof Date
        ? t.created_at
        : new Date(t.created_at as any);
    return createdDate.toISOString().split("T")[0];
  });

  const completedDates = todosForAnalysis
    .filter((t) => t.completed_at !== null && t.is_completed)
    .map((t) => {
      const completedDate =
        t.completed_at instanceof Date
          ? t.completed_at
          : new Date(t.completed_at as any);
      return completedDate.toISOString().split("T")[0];
    });

  // Calculate time-window metrics
  const todaysCreated = todosForAnalysis.filter((t) => {
    const createdDate =
      t.created_at instanceof Date
        ? t.created_at
        : new Date(t.created_at as any);
    return createdDate.toISOString().split("T")[0] === todayString;
  }).length;

  const last7dCreated = todosForAnalysis.filter((t) => {
    const createdDate =
      t.created_at instanceof Date
        ? t.created_at
        : new Date(t.created_at as any);
    const dateStr = createdDate.toISOString().split("T")[0];
    return dateStr >= sevenDaysAgoString;
  }).length;

  const last30dCreated = todosForAnalysis.filter((t) => {
    const createdDate =
      t.created_at instanceof Date
        ? t.created_at
        : new Date(t.created_at as any);
    const dateStr = createdDate.toISOString().split("T")[0];
    return dateStr >= thirtyDaysAgoString;
  }).length;

  const todaysCompleted = todosForAnalysis.filter((t) => {
    if (!t.is_completed || !t.completed_at) return false;
    const completedDate =
      t.completed_at instanceof Date
        ? t.completed_at
        : new Date(t.completed_at as any);
    return completedDate.toISOString().split("T")[0] === todayString;
  }).length;

  const last7dCompleted = todosForAnalysis.filter((t) => {
    if (!t.is_completed || !t.completed_at) return false;
    const completedDate =
      t.completed_at instanceof Date
        ? t.completed_at
        : new Date(t.completed_at as any);
    const dateStr = completedDate.toISOString().split("T")[0];
    return dateStr >= sevenDaysAgoString;
  }).length;

  // Build creation trend (30 days)
  const creationTrendMap = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const date = new Date(thirtyDaysAgo);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split("T")[0];
    creationTrendMap.set(dateStr, 0);
  }
  for (const dateStr of createdDates) {
    if (dateStr >= thirtyDaysAgoString) {
      creationTrendMap.set(dateStr, (creationTrendMap.get(dateStr) ?? 0) + 1);
    }
  }
  const creation_trend: ITodoCreationTrendDay[] = Array.from(
    creationTrendMap,
  ).map(([date, count]) => ({
    date: date as unknown as string & tags.Format<"date">,
    count: count as unknown as number & tags.Type<"int32">,
  }));

  // Build completion trend (30 days)
  const completionTrendMap = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const date = new Date(thirtyDaysAgo);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split("T")[0];
    completionTrendMap.set(dateStr, 0);
  }
  for (const dateStr of completedDates) {
    if (dateStr >= thirtyDaysAgoString) {
      completionTrendMap.set(
        dateStr,
        (completionTrendMap.get(dateStr) ?? 0) + 1,
      );
    }
  }
  const completion_trend: ITodoCompletionTrendDay[] = Array.from(
    completionTrendMap,
  ).map(([date, count]) => ({
    date: date as unknown as string & tags.Format<"date">,
    count: count as unknown as number & tags.Type<"int32">,
  }));

  // Calculate average completion time
  let average_completion_time_days = 0;
  const completedTodosData = todosForAnalysis.filter(
    (t) => t.is_completed && t.completed_at,
  );
  if (completedTodosData.length > 0) {
    let totalDays = 0;
    for (const todo of completedTodosData) {
      const createdDate =
        todo.created_at instanceof Date
          ? todo.created_at
          : new Date(todo.created_at as any);
      const completedDate =
        todo.completed_at instanceof Date
          ? todo.completed_at
          : new Date(todo.completed_at as any);
      const diffMs = completedDate.getTime() - createdDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      totalDays += diffDays;
    }
    average_completion_time_days = totalDays / completedTodosData.length;
  }

  // Calculate longest incomplete todo
  let longest_incomplete_todo_days = 0;
  for (const todo of todosForAnalysis) {
    if (!todo.is_completed) {
      const createdDate =
        todo.created_at instanceof Date
          ? todo.created_at
          : new Date(todo.created_at as any);
      const diffMs = now.getTime() - createdDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays > longest_incomplete_todo_days) {
        longest_incomplete_todo_days = diffDays;
      }
    }
  }

  // Calculate most active creation hour and day
  const hourCounts = new Map<number, number>();
  const dayCounts = new Map<number, number>();
  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  for (const todo of todosForAnalysis) {
    const createdDate =
      todo.created_at instanceof Date
        ? todo.created_at
        : new Date(todo.created_at as any);
    const hour = createdDate.getHours();
    const day = createdDate.getDay();
    hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
    dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);
  }

  let most_active_creation_hour = "0";
  if (hourCounts.size > 0) {
    const maxEntry = Array.from(hourCounts.entries()).reduce((a, b) =>
      a[1] > b[1] ? a : b,
    );
    most_active_creation_hour = String(maxEntry[0]);
  }

  let most_active_creation_day = "Monday";
  if (dayCounts.size > 0) {
    const maxEntry = Array.from(dayCounts.entries()).reduce((a, b) =>
      a[1] > b[1] ? a : b,
    );
    most_active_creation_day = dayNames[maxEntry[0]];
  }

  // Calculate average todos per user
  const average_todos_per_user = totalUsers > 0 ? totalTodos / totalUsers : 0;

  // Calculate median todos per user
  let median_todos_per_user = 0;
  if (userTodosCounts.length > 0) {
    const counts = userTodosCounts.map((u) => u._count).sort((a, b) => a - b);
    const midIndex = Math.floor(counts.length / 2);
    if (counts.length % 2 === 0) {
      median_todos_per_user = (counts[midIndex - 1] + counts[midIndex]) / 2;
    } else {
      median_todos_per_user = counts[midIndex];
    }
  }

  // Calculate completion rate
  const completion_rate_percent =
    totalTodos > 0 ? (completedTodos / totalTodos) * 100 : 0;

  return {
    total_todos: totalTodos as unknown as number & tags.Type<"int32">,
    completed_todos: completedTodos as unknown as number & tags.Type<"int32">,
    incomplete_todos: incompleteTodos as unknown as number & tags.Type<"int32">,
    completion_rate_percent,
    average_todos_per_user,
    todos_created_today: todaysCreated as unknown as number &
      tags.Type<"int32">,
    todos_created_7d: last7dCreated as unknown as number & tags.Type<"int32">,
    todos_created_30d: last30dCreated as unknown as number & tags.Type<"int32">,
    creation_trend,
    completion_trend,
    most_active_creation_hour,
    most_active_creation_day,
    todos_completed_today: todaysCompleted as unknown as number &
      tags.Type<"int32">,
    todos_completed_7d: last7dCompleted as unknown as number &
      tags.Type<"int32">,
    average_completion_time_days,
    longest_incomplete_todo_days:
      longest_incomplete_todo_days as unknown as number & tags.Type<"int32">,
    median_todos_per_user,
  };
}
