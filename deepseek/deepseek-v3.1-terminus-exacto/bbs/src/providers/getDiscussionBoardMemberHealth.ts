import { IDiscussionBoardSystemHealthMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemHealthMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { DiscussionBoardSystemHealthMetricTransformer } from "../transformers/DiscussionBoardSystemHealthMetricTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardMemberHealth(props: {
  member: MemberPayload;
}): Promise<IDiscussionBoardSystemHealthMetric> {
  // Calculate timestamp for last 15 minutes using string format
  const currentTimestamp = new Date().toISOString();
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  try {
    // Query recent health metrics from all services
    const metrics =
      await MyGlobal.prisma.discussion_board_system_health_metrics.findMany({
        where: {
          collection_timestamp: {
            gte: new Date(fifteenMinutesAgo),
          },
          deleted_at: null,
        },
        orderBy: {
          collection_timestamp: "desc",
        },
        ...DiscussionBoardSystemHealthMetricTransformer.select(),
      });
    // Aggregate overall health status using weakest link principle
    const statusPriority = { healthy: 0, warning: 1, critical: 2 };
    let overallStatus: string = "healthy";
    let worstMetricValue = 0;
    let worstService = "system";
    if (metrics.length > 0) {
      metrics.forEach((metric) => {
        const currentPriority =
          statusPriority[metric.status as keyof typeof statusPriority] || 0;
        const worstPriority =
          statusPriority[overallStatus as keyof typeof statusPriority] || 0;
        if (currentPriority > worstPriority) {
          overallStatus = metric.status;
          worstMetricValue = metric.metric_value;
          worstService = metric.source_service;
        }
      });
    } else {
      // No recent metrics - system health is unknown/critical
      overallStatus = "critical";
      worstMetricValue = 0;
      worstService = "system";
    }
    // Create aggregated health response
    return {
      id: v4(),
      metric_type: "overall_health",
      metric_value: worstMetricValue,
      unit: "score",
      source_service: worstService,
      collection_timestamp: currentTimestamp,
      status: overallStatus,
      deleted_at: null,
    };
  } catch (error) {
    // Database connectivity issue - return critical status
    return {
      id: v4(),
      metric_type: "connectivity",
      metric_value: 0,
      unit: "score",
      source_service: "database",
      collection_timestamp: currentTimestamp,
      status: "critical",
      deleted_at: null,
    };
  }
}
