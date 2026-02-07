import { IDiscussionBoardSystemActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemActivity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdminSystemActivitiesActivityId(props: {
  admin: AdminPayload;
  activityId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardSystemActivity> {
  // First, retrieve the specific activity to get its timestamp
  const targetActivity =
    await MyGlobal.prisma.discussion_board_system_activities.findUnique({
      where: { id: props.activityId },
    });
  if (!targetActivity) {
    throw new HttpException("System activity not found", 404);
  }
  // Convert the activity's created_at to Date for period calculations
  const activityDate = new Date(targetActivity.created_at);
  // Calculate start and end of the current day for the activity
  const startOfDay = new Date(activityDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(activityDate);
  endOfDay.setHours(23, 59, 59, 999);
  // Calculate start and end of previous day for comparison
  const startOfPreviousDay = new Date(startOfDay);
  startOfPreviousDay.setDate(startOfPreviousDay.getDate() - 1);
  const endOfPreviousDay = new Date(endOfDay);
  endOfPreviousDay.setDate(endOfPreviousDay.getDate() - 1);
  // Query for activities in the current day period
  const currentPeriodActivities =
    await MyGlobal.prisma.discussion_board_system_activities.findMany({
      where: {
        created_at: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });
  // Query for activities in the previous day period
  const previousPeriodActivities =
    await MyGlobal.prisma.discussion_board_system_activities.findMany({
      where: {
        created_at: {
          gte: startOfPreviousDay,
          lte: endOfPreviousDay,
        },
      },
    });
  // Calculate current period metrics
  const total_activities = currentPeriodActivities.length;
  const success_count = currentPeriodActivities.filter(
    (a) => a.success_status,
  ).length;
  const error_count = total_activities - success_count;
  const success_rate =
    total_activities > 0 ? (success_count / total_activities) * 100 : 0;
  // Calculate previous period metrics
  const prev_total_activities = previousPeriodActivities.length;
  const prev_success_count = previousPeriodActivities.filter(
    (a) => a.success_status,
  ).length;
  const prev_success_rate =
    prev_total_activities > 0
      ? (prev_success_count / prev_total_activities) * 100
      : 0;
  // Calculate percentage changes
  const total_activities_change =
    prev_total_activities > 0
      ? ((total_activities - prev_total_activities) / prev_total_activities) *
        100
      : 0;
  const success_rate_change =
    prev_success_rate > 0
      ? ((success_rate - prev_success_rate) / prev_success_rate) * 100
      : 0;
  // Determine trend direction
  let trend_direction: "improving" | "declining" | "stable" = "stable";
  if (success_rate_change > 5) trend_direction = "improving";
  else if (success_rate_change < -5) trend_direction = "declining";
  return {
    total_activities,
    success_count,
    error_count,
    success_rate,
    period: "daily",
    start_date: toISOStringSafe(startOfDay),
    end_date: toISOStringSafe(endOfDay),
    previous_period_comparison: {
      total_activities_change,
      success_rate_change,
      trend_direction,
    },
  };
}
