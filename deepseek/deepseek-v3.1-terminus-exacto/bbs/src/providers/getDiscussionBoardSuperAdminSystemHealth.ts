import { IDiscussionBoardPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPerformanceMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardPerformanceMetricTransformer } from "../transformers/DiscussionBoardPerformanceMetricTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdminSystemHealth(props: {
  superAdmin: SuperadminPayload;
}): Promise<IDiscussionBoardPerformanceMetric> {
  try {
    // Find the latest performance metric to verify database connectivity
    const latestMetric =
      await MyGlobal.prisma.discussion_board_performance_metrics.findFirst({
        orderBy: { collection_timestamp: "desc" as const },
        ...DiscussionBoardPerformanceMetricTransformer.select(),
      });
    if (latestMetric) {
      return await DiscussionBoardPerformanceMetricTransformer.transform(
        latestMetric,
      );
    }
  } catch (error) {
    // If database query fails, indicate connectivity issue
    const timestamp = toISOStringSafe(new Date());
    return {
      id: v4(),
      metric_type: "system_health_error",
      metric_value: 0.0,
      metric_unit: "status",
      source_component: "health_check",
      collection_timestamp: timestamp,
      time_range: "instantaneous",
      metadata: JSON.stringify({ error: "Database connectivity check failed" }),
      created_at: timestamp,
      updated_at: timestamp,
    };
  }
  // If no metrics exist but database is responsive
  const timestamp = toISOStringSafe(new Date());
  return {
    id: v4(),
    metric_type: "system_health",
    metric_value: 1.0,
    metric_unit: "status",
    source_component: "health_check",
    collection_timestamp: timestamp,
    time_range: "instantaneous",
    metadata: JSON.stringify({
      status: "No metrics found, database responsive",
    }),
    created_at: timestamp,
    updated_at: timestamp,
  };
}
