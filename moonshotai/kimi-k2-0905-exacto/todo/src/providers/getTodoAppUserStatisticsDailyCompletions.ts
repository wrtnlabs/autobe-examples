import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTaskCompletionsStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskCompletionsStatistics";
import { IDailyCompletionEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IDailyCompletionEntry";
import { ICompletionTrend } from "@ORGANIZATION/PROJECT-api/lib/structures/ICompletionTrend";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoAppUserStatisticsDailyCompletions(props: {
  user: UserPayload;
}): Promise<ITodoAppTaskCompletionsStatistics> {
  // Get all completion records for the authenticated user
  const completions = await MyGlobal.prisma.todo_app_task_completions.findMany({
    where: {
      todo_app_user_id: props.user.id,
      reactivated: false, // Only count final completions, not ones that were later reactivated
    },
    orderBy: {
      completed_at: "asc",
    },
  });

  // Group completions by calendar date
  const dailyMap = new Map<string, number>();

  for (const completion of completions) {
    // Extract date part (YYYY-MM-DD format) from completed_at datetime
    // toISOStringSafe returns ISO string format, split to get date part
    const dateOnly = toISOStringSafe(completion.completed_at).split("T")[0];
    dailyMap.set(dateOnly, (dailyMap.get(dateOnly) || 0) + 1);
  }

  // Convert to array of daily entries and sort by date
  const dailyCompletions: IDailyCompletionEntry[] = Array.from(
    dailyMap.entries(),
  )
    .map(([date, completion_count]) => ({
      date: date as string & tags.Format<"date">,
      completion_count: completion_count as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Calculate total completions
  const total_completions = completions.length as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;

  // Calculate distinct days with completions
  const distinct_days_with_completions = dailyMap.size as number &
    tags.Type<"int32"> &
    tags.Minimum<0> &
    tags.Maximum<31>;

  // Calculate average daily completions (optional field)
  const average_daily_completions =
    distinct_days_with_completions > 0
      ? total_completions / distinct_days_with_completions
      : undefined;

  // Find best day (most completions)
  let best_day_completions: number | undefined;
  let best_day_date: string | undefined;

  for (const [date, count] of dailyMap.entries()) {
    if (!best_day_completions || count > best_day_completions) {
      best_day_completions = count as number &
        tags.Type<"int32"> &
        tags.Minimum<0>;
      best_day_date = date as string & tags.Format<"date">;
    }
  }

  // Calculate trend analysis (optional)
  let trend: ICompletionTrend | undefined;

  if (dailyCompletions.length >= 14) {
    // Get last 14 days split into recent week and previous week
    const recentWeek = dailyCompletions.slice(-7);
    const previousWeek = dailyCompletions.slice(-14, -7);

    const recentAvg =
      recentWeek.reduce((sum, day) => sum + day.completion_count, 0) / 7;
    const previousAvg =
      previousWeek.reduce((sum, day) => sum + day.completion_count, 0) / 7;

    let direction: "increasing" | "decreasing" | "stable";
    let weekly_average_change_percent: number | undefined;

    if (previousAvg > 0) {
      weekly_average_change_percent =
        ((recentAvg - previousAvg) / previousAvg) * 100;

      if (Math.abs(weekly_average_change_percent) < 5) {
        direction = "stable";
      } else if (weekly_average_change_percent > 0) {
        direction = "increasing";
      } else {
        direction = "decreasing";
      }
    } else {
      direction = recentAvg > 0 ? "increasing" : "stable";
      weekly_average_change_percent =
        previousAvg === 0 && recentAvg > 0 ? 100 : 0;
    }

    // Calculate consistency score (based on coefficient of variation)
    const allCounts = dailyCompletions.map((d) => d.completion_count);
    const avg =
      allCounts.reduce((sum, count) => sum + count, 0) / allCounts.length;
    const variance =
      allCounts.reduce((sum, count) => sum + Math.pow(count - avg, 2), 0) /
      allCounts.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = avg > 0 ? stdDev / avg : 0;
    const consistency_score = Math.max(
      0,
      Math.min(100, (1 - coefficientOfVariation) * 100),
    );

    trend = {
      direction,
      weekly_average_change_percent,
      consistency_score,
    };
  }

  // Determine analysis period (optional)
  let analysis_period_start_date: string | undefined;
  let analysis_period_end_date: string | undefined;

  if (dailyCompletions.length > 0) {
    analysis_period_start_date = dailyCompletions[0].date;
    analysis_period_end_date =
      dailyCompletions[dailyCompletions.length - 1].date;
  }

  return {
    total_completions,
    distinct_days_with_completions,
    daily_completions: dailyCompletions,
    average_daily_completions,
    best_day_completions,
    best_day_date,
    trend,
    analysis_period_start_date,
    analysis_period_end_date,
  };
}
