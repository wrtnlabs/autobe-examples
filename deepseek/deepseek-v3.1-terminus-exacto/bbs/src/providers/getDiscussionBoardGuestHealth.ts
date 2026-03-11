import { IDiscussionBoardSystemHealthMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemHealthMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardSystemHealthMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemHealthMetric";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { DiscussionBoardSystemHealthMetricAtSummaryTransformer } from "../transformers/DiscussionBoardSystemHealthMetricAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardGuestHealth(props: {
  guest: GuestPayload;
}): Promise<IPageIDiscussionBoardSystemHealthMetric.ISummary> {
  // Default pagination values for health check
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Calculate 15 minutes ago for filtering (Date for Prisma only)
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  // First, get all recent metrics to aggregate status
  const allRecentMetrics =
    await MyGlobal.prisma.discussion_board_system_health_metrics.findMany({
      where: {
        collection_timestamp: {
          gte: fifteenMinutesAgo,
        },
        deleted_at: null,
      },
      orderBy: {
        collection_timestamp: "desc",
      },
      select: {
        id: true,
        source_service: true,
        status: true,
        metric_type: true,
        metric_value: true,
        unit: true,
        collection_timestamp: true,
      },
    });
  // Group by source service to determine worst status
  const serviceStatusMap = new Map<string, string>();
  const serviceMetrics = new Map<string, (typeof allRecentMetrics)[0]>();
  // Define status priority: critical > warning > healthy
  const statusPriority = {
    critical: 3,
    warning: 2,
    healthy: 1,
  };
  for (const metric of allRecentMetrics) {
    const currentPriority =
      statusPriority[metric.status as keyof typeof statusPriority] || 0;
    const existingPriority = serviceStatusMap.has(metric.source_service)
      ? statusPriority[
          serviceStatusMap.get(
            metric.source_service,
          )! as keyof typeof statusPriority
        ] || 0
      : 0;
    // Keep the worst status (highest priority)
    if (currentPriority > existingPriority) {
      serviceStatusMap.set(metric.source_service, metric.status);
    }
    // Keep the most recent metric for each service for detailed info
    if (!serviceMetrics.has(metric.source_service)) {
      serviceMetrics.set(metric.source_service, metric);
    }
  }
  // Convert map to array for pagination
  const serviceMetricsArray = Array.from(serviceMetrics.values());
  const paginatedData = serviceMetricsArray.slice(skip, skip + limit);
  // Get paginated metrics with full transformer selection
  const detailedMetrics =
    await MyGlobal.prisma.discussion_board_system_health_metrics.findMany({
      where: {
        id: {
          in: paginatedData.map((m) => m.id),
        },
        deleted_at: null,
      },
      ...DiscussionBoardSystemHealthMetricAtSummaryTransformer.select(),
    });
  // Transform results using existing transformer
  const transformedData = await ArrayUtil.asyncMap(
    detailedMetrics,
    DiscussionBoardSystemHealthMetricAtSummaryTransformer.transform,
  );
  // Apply aggregated status to transformed data
  const finalData = transformedData.map((metric) => ({
    ...metric,
    status: serviceStatusMap.get(metric.source_service) || metric.status,
  }));
  return {
    data: finalData,
    pagination: {
      current: page,
      limit: limit,
      records: serviceMetricsArray.length,
      pages: Math.ceil(serviceMetricsArray.length / limit),
    } satisfies IPage.IPagination,
  };
}
