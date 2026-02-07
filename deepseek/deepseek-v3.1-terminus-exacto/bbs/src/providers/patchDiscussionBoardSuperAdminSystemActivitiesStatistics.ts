import { IDiscussionBoardSystemActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemActivity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminSystemActivitiesStatistics(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardSystemActivity.IRequest;
}): Promise<IDiscussionBoardSystemActivity> {
  const {
    start_date,
    end_date,
    activity_type,
    group_by = "daily",
    page = 1,
    limit = 100,
  } = props.body;
  // Parse and validate date ranges using ISO strings
  const startDateStr =
    start_date ||
    toISOStringSafe(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const endDateStr = end_date || toISOStringSafe(new Date());
  // Validate date strings are valid ISO format
  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new HttpException("Invalid date format. Use ISO 8601 format.", 400);
  }
  if (startDate > endDate) {
    throw new HttpException("Start date cannot be after end date", 400);
  }
  // Calculate previous period for comparison
  const periodDuration = endDate.getTime() - startDate.getTime();
  const previousPeriodStart = new Date(startDate.getTime() - periodDuration);
  const previousPeriodEnd = new Date(startDate.getTime() - 1);
  // Build WHERE conditions for current period
  const whereCurrent: Prisma.discussion_board_system_activitiesWhereInput = {
    created_at: {
      gte: startDate,
      lte: endDate,
    },
    ...(activity_type && { activity_type }),
  };
  // Build WHERE conditions for previous period
  const wherePrevious: Prisma.discussion_board_system_activitiesWhereInput = {
    created_at: {
      gte: previousPeriodStart,
      lte: previousPeriodEnd,
    },
    ...(activity_type && { activity_type }),
  };
  // Use single aggregation queries for better performance
  const [currentStats, previousStats] = await Promise.all([
    // Current period aggregation
    MyGlobal.prisma.$queryRaw<
      Array<{
        total: bigint;
        success_count: bigint;
      }>
    >`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE success_status = true) as success_count
      FROM discussion_board_system_activities 
      WHERE created_at >= ${startDate} AND created_at <= ${endDate}
        ${activity_type ? Prisma.sql`AND activity_type = ${activity_type}` : Prisma.empty}
    `,
    // Previous period aggregation
    MyGlobal.prisma.$queryRaw<
      Array<{
        total: bigint;
        success_count: bigint;
      }>
    >`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE success_status = true) as success_count
      FROM discussion_board_system_activities 
      WHERE created_at >= ${previousPeriodStart} AND created_at <= ${previousPeriodEnd}
        ${activity_type ? Prisma.sql`AND activity_type = ${activity_type}` : Prisma.empty}
    `,
  ]);
  const currentTotal = Number(currentStats[0]?.total || 0);
  const currentSuccess = Number(currentStats[0]?.success_count || 0);
  const currentError = currentTotal - currentSuccess;
  const currentSuccessRate =
    currentTotal > 0 ? (currentSuccess / currentTotal) * 100 : 0;
  const previousTotal = Number(previousStats[0]?.total || 0);
  const previousSuccess = Number(previousStats[0]?.success_count || 0);
  const previousSuccessRate =
    previousTotal > 0 ? (previousSuccess / previousTotal) * 100 : 0;
  // Calculate percentage changes
  const totalActivitiesChange =
    previousTotal > 0
      ? ((currentTotal - previousTotal) / previousTotal) * 100
      : currentTotal > 0
        ? 100
        : 0;
  const successRateChange =
    previousSuccessRate > 0
      ? currentSuccessRate - previousSuccessRate
      : currentSuccessRate > 0
        ? 100
        : 0;
  const trendDirection =
    successRateChange > 5
      ? "improving"
      : successRateChange < -5
        ? "declining"
        : "stable";
  return {
    total_activities: currentTotal,
    success_count: currentSuccess,
    error_count: currentError,
    success_rate: currentSuccessRate,
    period: group_by,
    start_date: toISOStringSafe(startDate),
    end_date: toISOStringSafe(endDate),
    previous_period_comparison: {
      total_activities_change: totalActivitiesChange,
      success_rate_change: successRateChange,
      trend_direction: trendDirection,
    },
  };
}
