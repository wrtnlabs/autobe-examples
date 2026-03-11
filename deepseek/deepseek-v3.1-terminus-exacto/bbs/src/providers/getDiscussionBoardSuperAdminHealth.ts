import { IDiscussionBoardSystemHealthMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemHealthMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardSystemHealthMetricTransformer } from "../transformers/DiscussionBoardSystemHealthMetricTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdminHealth(props: {
  superAdmin: SuperadminPayload;
}): Promise<IDiscussionBoardSystemHealthMetric> {
  // Calculate timestamp for 15 minutes ago
  const fifteenMinutesAgo = new Date();
  fifteenMinutesAgo.setMinutes(fifteenMinutesAgo.getMinutes() - 15);
  // Query recent health metrics (last 15 minutes)
  const recentMetrics =
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
      take: 50, // Limit to most recent 50 metrics for aggregation
      ...DiscussionBoardSystemHealthMetricTransformer.select(),
    });
  // Determine overall status using worst-link principle
  let overallStatus: string = "unknown";
  if (recentMetrics.length > 0) {
    // Order: critical > warning > healthy
    const hasCritical = recentMetrics.some((m) => m.status === "critical");
    const hasWarning = recentMetrics.some((m) => m.status === "warning");
    if (hasCritical) {
      overallStatus = "critical";
    } else if (hasWarning) {
      overallStatus = "warning";
    } else {
      overallStatus = "healthy";
    }
  }
  // Check database connectivity by performing a simple query
  try {
    await MyGlobal.prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    // Database connection issue
    overallStatus = "critical";
    throw new HttpException("Database connectivity check failed", 503);
  }
  // Check system configuration health
  try {
    // Access environment variables to verify configuration
    const env = MyGlobal.env;
    if (!env.API_PORT || !env.JWT_SECRET_KEY) {
      overallStatus = "warning";
    }
  } catch (error) {
    overallStatus = "critical";
  }
  // Use the most recent metric as representative, or create synthetic one
  let responseMetric;
  if (recentMetrics.length > 0) {
    responseMetric = recentMetrics[0];
  } else {
    // Create synthetic metric for response
    responseMetric = {
      id: v4(),
      metric_type: "system_health",
      metric_value:
        overallStatus === "healthy"
          ? 100
          : overallStatus === "warning"
            ? 50
            : 0,
      unit: "score",
      source_service: "health_check_service",
      collection_timestamp: new Date(),
      status: overallStatus,
      deleted_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      metadata: [], // Add empty metadata array to match expected type
    };
  }
  // Transform to DTO format
  const transformed =
    await DiscussionBoardSystemHealthMetricTransformer.transform(
      responseMetric,
    );
  // Override status with aggregated overall status
  transformed.status = overallStatus;
  // Return the health metric response
  return transformed;
}
