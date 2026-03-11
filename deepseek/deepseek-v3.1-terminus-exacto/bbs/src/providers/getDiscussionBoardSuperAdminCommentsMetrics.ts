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

export async function getDiscussionBoardSuperAdminCommentsMetrics(props: {
  superAdmin: SuperadminPayload;
}): Promise<IDiscussionBoardSystemHealthMetric> {
  // Query metrics filtered by comment-related types and sorted by latest first
  const metrics =
    await MyGlobal.prisma.discussion_board_system_health_metrics.findMany({
      where: {
        metric_type: {
          in: [
            "comment_response_time",
            "comment_success_rate",
            "comment_error_rate",
            "comment_connection_health",
            "comment_throughput",
          ],
        },
        deleted_at: null,
      },
      orderBy: { collection_timestamp: "desc" },
      ...DiscussionBoardSystemHealthMetricTransformer.select(),
    });
  // Transform all metrics
  const transformed = await ArrayUtil.asyncMap(
    metrics,
    DiscussionBoardSystemHealthMetricTransformer.transform,
  );
  // Create a summary metric object that aggregates the comment metrics
  const summaryMetric: IDiscussionBoardSystemHealthMetric = {
    id: v4(),
    metric_type: "comment_metrics_summary",
    metric_value: transformed.length,
    unit: "count",
    collection_timestamp: toISOStringSafe(new Date()),
    source_service: "discussion_board_superadmin",
    status: "active",
  };
  // Return the summary metric
  return summaryMetric;
}
