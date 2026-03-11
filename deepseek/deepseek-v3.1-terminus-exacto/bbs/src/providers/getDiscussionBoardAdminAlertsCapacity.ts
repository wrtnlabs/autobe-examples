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

export async function getDiscussionBoardAdminAlertsCapacity(props: {
  admin: AdminPayload;
}): Promise<IDiscussionBoardSystemHealthMetric> {
  // Get the latest storage utilization metric (primary capacity indicator)
  const latestMetric =
    await MyGlobal.prisma.discussion_board_system_health_metrics.findFirst({
      where: {
        metric_type: "storage_utilization",
        deleted_at: null,
      },
      orderBy: {
        collection_timestamp: "desc",
      },
    });
  if (!latestMetric) {
    throw new HttpException("No capacity metrics found", 404);
  }
  // Apply capacity thresholds from requirements
  const metricValue = latestMetric.metric_value;
  let status = latestMetric.status;
  // Override status based on capacity thresholds
  if (metricValue >= 85) {
    status = "critical";
  } else if (metricValue >= 70) {
    status = "warning";
  }
  // Create the required metadata array (empty array since we don't have metadata from Prisma)
  const metadata: Array<{
    key: string;
    created_at: Date;
    updated_at: Date;
    id: string;
    value: string;
    system_health_metric_id: string;
  }> = [];
  return await DiscussionBoardSystemHealthMetricTransformer.transform({
    ...latestMetric,
    status: status,
    metadata: metadata,
  });
}
