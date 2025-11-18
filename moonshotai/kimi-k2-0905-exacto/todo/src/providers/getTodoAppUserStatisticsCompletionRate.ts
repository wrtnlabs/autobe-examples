import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTaskCompletionRateStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskCompletionRateStatistics";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoAppUserStatisticsCompletionRate(props: {
  user: UserPayload;
}): Promise<ITodoAppTaskCompletionRateStatistics> {
  const now = new Date();
  const todayISO = toISOStringSafe(now);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgoISO = toISOStringSafe(thirtyDaysAgo);

  const userId = props.user.id;

  // Get total tasks count (not excluding soft-deleted since deleted_at field doesn't exist)
  const totalTasks = await MyGlobal.prisma.todo_app_tasks.count({
    where: {
      todo_app_user_id: userId,
    },
  });

  if (totalTasks === 0) {
    return {
      total_tasks: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
      completed_tasks: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
      incomplete_tasks: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
      completion_rate_percent: 0 as number &
        tags.Minimum<0> &
        tags.Maximum<100>,
      calculation_date: todayISO,
    };
  }

  // Get completed tasks count
  const completedTasks = await MyGlobal.prisma.todo_app_task_completions.count({
    where: {
      todo_app_user_id: userId,
      reactivated: false,
    },
  });

  const incompleteTasks = totalTasks - completedTasks;
  const completionRatePercent = Math.round((completedTasks / totalTasks) * 100);

  // Get recent completion rate (last 30 days)
  const recentCompletedTasks =
    await MyGlobal.prisma.todo_app_task_completions.count({
      where: {
        todo_app_user_id: userId,
        completed_at: { gte: thirtyDaysAgo },
        reactivated: false,
      },
    });

  // Recent tasks for the period: tasks created before the 30-day end but completed within the period
  // Remove completions filter and just count tasks that were created within recent period
  const recentPeriodTasks = await MyGlobal.prisma.todo_app_tasks.count({
    where: {
      todo_app_user_id: userId,
      created_at: {
        gte: thirtyDaysAgo,
        lte: todayISO,
      },
    },
  });

  let recentCompletionRatePercent: number | undefined;
  if (recentPeriodTasks > 0) {
    recentCompletionRatePercent = Math.round(
      (recentCompletedTasks / recentPeriodTasks) * 100,
    );
  }

  // Calculate streak metrics
  const streakQuery = await MyGlobal.prisma.$queryRaw<
    {
      date: Date;
      completion_count: number;
    }[]
  >`
    SELECT 
      DATE_TRUNC('day', completed_at) as date,
      COUNT(*) as completion_count
    FROM todo_app_task_completions
    WHERE todo_app_user_id = ${userId}::uuid
      AND reactivated = false
      AND completed_at >= NOW() - INTERVAL '31 days'
    GROUP BY DATE_TRUNC('day', completed_at)
    ORDER BY date DESC
  `;

  let streakDays = 0;
  let longestStreak = 0;

  if (streakQuery.length > 0) {
    const todayDateStr = now.toISOString().split("T")[0];

    // Calculate current streak (consecutive days ending today)
    for (let i = 0; i < 31; i++) {
      const checkDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const checkDateStr = checkDate.toISOString().split("T")[0];

      const hasCompletion = streakQuery.some((row) => {
        const completionDateStr = row.date.toISOString().split("T")[0];
        return completionDateStr === checkDateStr;
      });

      if (hasCompletion) {
        if (i === 0) streakDays = 1;
        else streakDays++;
        if (streakDays > longestStreak) longestStreak = streakDays;
      } else {
        if (i === 0) {
          continue;
        }
        break;
      }
    }
  }

  // Calculate average completion time
  const completionTimeQuery = await MyGlobal.prisma.$queryRaw<
    {
      completion_time_days: number;
    }[]
  >`
    SELECT 
      AVG(EXTRACT(EPOCH FROM (tc.completed_at - t.created_at)) / 86400) as completion_time_days
    FROM todo_app_task_completions tc
    INNER JOIN todo_app_tasks t ON t.id = tc.todo_app_task_id
    WHERE tc.todo_app_user_id = ${userId}::uuid
      AND tc.reactivated = false
      AND tc.completed_at IS NOT NULL
  `;

  const averageCompletionTimeDays =
    completionTimeQuery[0]?.completion_time_days;

  // Find most productive day of week
  const dayOfWeekQuery = await MyGlobal.prisma.$queryRaw<
    {
      day_of_week: number;
      completion_count: number;
    }[]
  >`
    SELECT 
      EXTRACT(ISODOW FROM completed_at) as day_of_week,
      COUNT(*) as completion_count
    FROM todo_app_task_completions
    WHERE todo_app_user_id = ${userId}::uuid
      AND reactivated = false
    GROUP BY EXTRACT(ISODOW FROM completed_at)
    ORDER BY completion_count DESC
    LIMIT 1
  `;

  let mostProductiveDay: ITodoAppTaskCompletionRateStatistics["most_productive_day_of_week"] =
    undefined;
  if (dayOfWeekQuery.length > 0 && dayOfWeekQuery[0].completion_count > 0) {
    const dayNames = [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ] as const;
    mostProductiveDay = dayNames[dayOfWeekQuery[0].day_of_week - 1];
  }

  return {
    total_tasks: totalTasks as number & tags.Type<"int32"> & tags.Minimum<0>,
    completed_tasks: completedTasks as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    incomplete_tasks: incompleteTasks as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    completion_rate_percent: completionRatePercent as number &
      tags.Minimum<0> &
      tags.Maximum<100>,
    recent_completion_rate_percent: recentCompletionRatePercent,
    streak_days:
      streakDays > 0
        ? (streakDays as number & tags.Type<"int32"> & tags.Minimum<0>)
        : undefined,
    longest_streak_days:
      longestStreak > 0
        ? (longestStreak as number & tags.Type<"int32"> & tags.Minimum<0>)
        : undefined,
    average_completion_time_days: averageCompletionTimeDays,
    most_productive_day_of_week: mostProductiveDay,
    calculation_date: todayISO,
  };
}
