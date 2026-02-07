import { IDiscussionBoardPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPerformanceMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardPerformanceMetricTransformer } from "../transformers/DiscussionBoardPerformanceMetricTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdminSystemHealth(props: {
  admin: AdminPayload;
}): Promise<IDiscussionBoardPerformanceMetric> {
  // Perform minimal database check by querying for any recent performance metric
  const recentMetric =
    await MyGlobal.prisma.discussion_board_performance_metrics.findFirst({
      orderBy: {
        collection_timestamp: "desc",
      },
      ...DiscussionBoardPerformanceMetricTransformer.select(),
    });
  if (recentMetric) {
    // If we have recent metrics, system is healthy
    return await DiscussionBoardPerformanceMetricTransformer.transform(
      recentMetric,
    );
  }
  // If no metrics exist, return a basic health status indicating system is operational
  // but no detailed metrics are available yet
  const currentTimestamp = toISOStringSafe(new Date());
  return {
    id: v4(),
    metric_type: "system_health",
    metric_value: 100,
    metric_unit: "percentage",
    source_component: "api_gateway",
    collection_timestamp: currentTimestamp,
    time_range: "instantaneous",
    metadata: JSON.stringify({
      status: "operational",
      message: "System is running but no performance metrics collected yet",
      timestamp: currentTimestamp,
    }),
    created_at: currentTimestamp,
    updated_at: currentTimestamp,
  };
}
