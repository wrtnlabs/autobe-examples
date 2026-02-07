import { IDiscussionBoardErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardErrorLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardErrorLog";
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

export async function patchDiscussionBoardAdminErrorLogsAnalytics(props: {
  admin: AdminPayload;
  body: IDiscussionBoardErrorLog.IAnalyticsRequest;
}): Promise<IPageIDiscussionBoardErrorLog.IAnalyticsSummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause with all filters - using string dates directly
  const whereInput = {
    occurred_at: {
      gte: props.body.start_date, // Use string directly since Prisma handles ISO strings
      lte: props.body.end_date,
    },
    error_type: props.body.error_type,
    severity: props.body.severity,
    environment: props.body.environment,
    ...(props.body.component !== undefined && props.body.component !== null
      ? { component: props.body.component }
      : props.body.component === null
        ? { component: null }
        : {}),
    deleted_at: null,
  } satisfies Prisma.discussion_board_error_logsWhereInput;
  // Get aggregated data using Prisma's groupBy
  const aggregatedData =
    await MyGlobal.prisma.discussion_board_error_logs.groupBy({
      by: ["error_type", "severity", "component", "environment"],
      where: whereInput,
      _count: {
        id: true,
      },
      _min: {
        occurred_at: true,
      },
      _max: {
        occurred_at: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
      skip: skip,
      take: limit,
    });
  // Enhanced trend analysis with time-based frequency calculation
  const dataWithAnalytics = await Promise.all(
    aggregatedData.map(async (group) => {
      const errorCount = group._count.id;
      // Get time distribution for trend analysis
      const timeDistribution =
        await MyGlobal.prisma.discussion_board_error_logs.findMany({
          where: {
            ...whereInput,
            error_type: group.error_type,
            severity: group.severity,
            component: group.component,
            environment: group.environment,
          },
          select: {
            occurred_at: true,
          },
          orderBy: {
            occurred_at: "asc",
          },
        });
      // Calculate average occurrence rate
      let averageRate = 0;
      if (timeDistribution.length > 1) {
        const firstOccurrence = timeDistribution[0].occurred_at;
        const lastOccurrence =
          timeDistribution[timeDistribution.length - 1].occurred_at;
        const timeDiffMs =
          new Date(lastOccurrence).getTime() -
          new Date(firstOccurrence).getTime();
        const daysDiff = timeDiffMs / (1000 * 60 * 60 * 24);
        averageRate = daysDiff > 0 ? errorCount / daysDiff : errorCount;
      } else {
        averageRate = errorCount;
      }
      // More sophisticated trend analysis
      let trendDirection: "increasing" | "decreasing" | "stable" = "stable";
      if (timeDistribution.length >= 3) {
        // Split data into halves and compare frequencies
        const midPoint = Math.floor(timeDistribution.length / 2);
        const firstHalfCount = midPoint;
        const secondHalfCount = timeDistribution.length - midPoint;
        const firstHalfDuration =
          new Date(timeDistribution[midPoint - 1].occurred_at).getTime() -
          new Date(timeDistribution[0].occurred_at).getTime();
        const secondHalfDuration =
          new Date(
            timeDistribution[timeDistribution.length - 1].occurred_at,
          ).getTime() -
          new Date(timeDistribution[midPoint].occurred_at).getTime();
        const firstHalfRate =
          firstHalfDuration > 0
            ? firstHalfCount / (firstHalfDuration / (1000 * 60 * 60 * 24))
            : firstHalfCount;
        const secondHalfRate =
          secondHalfDuration > 0
            ? secondHalfCount / (secondHalfDuration / (1000 * 60 * 60 * 24))
            : secondHalfCount;
        if (secondHalfRate > firstHalfRate * 1.2) trendDirection = "increasing";
        else if (secondHalfRate < firstHalfRate * 0.8)
          trendDirection = "decreasing";
        else trendDirection = "stable";
      }
      return {
        error_type: group.error_type,
        severity: group.severity,
        component: group.component,
        environment: group.environment,
        error_count: errorCount,
        average_occurrence_rate: averageRate,
        trend_direction: trendDirection,
        first_occurrence: toISOStringSafe(group._min.occurred_at ?? new Date()),
        last_occurrence: toISOStringSafe(group._max.occurred_at ?? new Date()),
      };
    }),
  );
  // Get total count of distinct groups for pagination
  const distinctGroups =
    await MyGlobal.prisma.discussion_board_error_logs.groupBy({
      by: ["error_type", "severity", "component", "environment"],
      where: whereInput,
      _count: {
        id: true,
      },
    });
  const total = distinctGroups.length;
  return {
    data: dataWithAnalytics,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
