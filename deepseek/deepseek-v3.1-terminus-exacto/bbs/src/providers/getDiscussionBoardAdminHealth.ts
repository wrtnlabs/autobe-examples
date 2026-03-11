import { IDiscussionBoardSystemHealthMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemHealthMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardSystemHealthMetricTransformer } from "../transformers/DiscussionBoardSystemHealthMetricTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdminHealth(props: {
  admin: AdminPayload;
}): Promise<IDiscussionBoardSystemHealthMetric> {
  // Get current ISO timestamp using safe helper
  const now = toISOStringSafe(new Date());
  // Calculate cutoff timestamp: 15 minutes ago
  const cutoff = toISOStringSafe(new Date(Date.now() - 15 * 60 * 1000));
  // Query recent health metrics
  const recentMetrics =
    await MyGlobal.prisma.discussion_board_system_health_metrics.findMany({
      where: {
        collection_timestamp: {
          gte: new Date(cutoff),
        },
        deleted_at: null,
      },
      orderBy: {
        collection_timestamp: "desc" as const,
      },
      ...DiscussionBoardSystemHealthMetricTransformer.select(),
    });
  // Determine worst status
  let worstStatus: string = "healthy";
  if (recentMetrics.length === 0) {
    // No recent metrics - monitoring failure
    worstStatus = "critical";
    // Create a synthetic health metric for response
    return {
      id: v4(),
      metric_type: "system_monitoring",
      metric_value: 0,
      unit: "status",
      source_service: "health_check_endpoint",
      collection_timestamp: now,
      status: "critical",
      deleted_at: null,
    } satisfies IDiscussionBoardSystemHealthMetric;
  }
  // Determine worst status from actual metrics
  for (const metric of recentMetrics) {
    if (metric.status === "critical") {
      worstStatus = "critical";
      break;
    } else if (metric.status === "warning" && worstStatus !== "critical") {
      worstStatus = "warning";
    }
  }
  // Select representative metric (prefer critical/warning, fallback to most recent)
  let representativeMetric = recentMetrics[0]; // Most recent by default
  if (worstStatus === "critical") {
    const criticalMetric = recentMetrics.find((m) => m.status === "critical");
    if (criticalMetric) representativeMetric = criticalMetric;
  } else if (worstStatus === "warning") {
    const warningMetric = recentMetrics.find((m) => m.status === "warning");
    if (warningMetric) representativeMetric = warningMetric;
  }
  // Transform and return
  const transformed =
    await DiscussionBoardSystemHealthMetricTransformer.transform(
      representativeMetric,
    );
  // Ensure the returned status matches the aggregated worst status
  if (transformed.status !== worstStatus) {
    return {
      ...transformed,
      status: worstStatus,
    };
  }
  return transformed;
}
