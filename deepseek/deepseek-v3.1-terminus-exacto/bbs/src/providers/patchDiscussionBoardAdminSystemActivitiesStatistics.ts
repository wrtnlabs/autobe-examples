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

export async function patchDiscussionBoardAdminSystemActivitiesStatistics(props: {
  admin: AdminPayload;
  body: IDiscussionBoardSystemActivity.IRequest;
}): Promise<IDiscussionBoardSystemActivity> {
  // Get current timestamp as ISO string
  const now = toISOStringSafe(new Date());
  // Calculate default date ranges using string manipulation
  const defaultStartDate = toISOStringSafe(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  );
  const startDate = props.body.start_date ?? defaultStartDate;
  const endDate = props.body.end_date ?? now;
  const groupBy = props.body.group_by ?? "daily";
  // Build where clause
  const whereInput: Prisma.discussion_board_system_activitiesWhereInput = {
    created_at: {
      gte: startDate,
      lte: endDate,
    },
    ...(props.body.activity_type && {
      activity_type: props.body.activity_type,
    }),
  };
  // Get total counts using aggregation
  const [totalResult, successResult] = await Promise.all([
    MyGlobal.prisma.discussion_board_system_activities.aggregate({
      where: whereInput,
      _count: { _all: true },
    }),
    MyGlobal.prisma.discussion_board_system_activities.aggregate({
      where: { ...whereInput, success_status: true },
      _count: { _all: true },
    }),
  ]);
  const totalActivities = totalResult._count._all;
  const successCount = successResult._count._all;
  const errorCount = totalActivities - successCount;
  const successRate =
    totalActivities > 0 ? (successCount / totalActivities) * 100 : 0;
  // Calculate previous period dates using string manipulation
  const startDateObj = new Date(startDate);
  const endDateObj = new Date(endDate);
  const periodDuration = endDateObj.getTime() - startDateObj.getTime();
  const previousStartDate = toISOStringSafe(
    new Date(startDateObj.getTime() - periodDuration),
  );
  const previousEndDate = toISOStringSafe(
    new Date(endDateObj.getTime() - periodDuration),
  );
  // Get previous period statistics
  const [previousTotalResult, previousSuccessResult] = await Promise.all([
    MyGlobal.prisma.discussion_board_system_activities.aggregate({
      where: {
        created_at: {
          gte: previousStartDate,
          lte: previousEndDate,
        },
        ...(props.body.activity_type && {
          activity_type: props.body.activity_type,
        }),
      },
      _count: { _all: true },
    }),
    MyGlobal.prisma.discussion_board_system_activities.aggregate({
      where: {
        created_at: {
          gte: previousStartDate,
          lte: previousEndDate,
        },
        success_status: true,
        ...(props.body.activity_type && {
          activity_type: props.body.activity_type,
        }),
      },
      _count: { _all: true },
    }),
  ]);
  const previousTotalActivities = previousTotalResult._count._all;
  const previousSuccessCount = previousSuccessResult._count._all;
  const previousSuccessRate =
    previousTotalActivities > 0
      ? (previousSuccessCount / previousTotalActivities) * 100
      : 0;
  // Calculate comparison metrics
  const totalActivitiesChange =
    previousTotalActivities > 0
      ? ((totalActivities - previousTotalActivities) /
          previousTotalActivities) *
        100
      : totalActivities > 0
        ? 100
        : 0;
  const successRateChange =
    previousSuccessRate > 0
      ? ((successRate - previousSuccessRate) / previousSuccessRate) * 100
      : successRate > 0
        ? 100
        : 0;
  const trendDirection =
    successRateChange > 5
      ? "improving"
      : successRateChange < -5
        ? "declining"
        : "stable";
  return {
    total_activities: totalActivities,
    success_count: successCount,
    error_count: errorCount,
    success_rate: successRate,
    period: groupBy,
    start_date: startDate,
    end_date: endDate,
    previous_period_comparison: {
      total_activities_change: totalActivitiesChange,
      success_rate_change: successRateChange,
      trend_direction: trendDirection,
    },
  };
}
