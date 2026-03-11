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
import { DiscussionBoardSystemHealthMetricAtSummaryTransformer } from "../transformers/DiscussionBoardSystemHealthMetricAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdminMonitoring(props: {
  superAdmin: SuperadminPayload;
}): Promise<IDiscussionBoardSystemHealthMetric.ISummary> {
  // Query the most recent system health metric that represents overall system status
  const recentMetric =
    await MyGlobal.prisma.discussion_board_system_health_metrics.findFirst({
      where: {
        deleted_at: null,
        metric_type: "system_health_status",
        OR: [
          { metric_type: "overall_status" },
          { metric_type: "system_health" },
          { metric_type: "health_status" },
        ],
      },
      orderBy: {
        collection_timestamp: "desc",
      },
      ...DiscussionBoardSystemHealthMetricAtSummaryTransformer.select(),
    });
  // If no specific overall status metric exists, get the most recent metric of any type
  const fallbackMetric = recentMetric
    ? recentMetric
    : await MyGlobal.prisma.discussion_board_system_health_metrics.findFirst({
        where: {
          deleted_at: null,
        },
        orderBy: {
          collection_timestamp: "desc",
        },
        ...DiscussionBoardSystemHealthMetricAtSummaryTransformer.select(),
      });
  if (!fallbackMetric) {
    // Return default structure if no metrics exist yet
    return {
      id: v4(),
      metric_type: "system_overview",
      metric_value: 0,
      unit: "score",
      source_service: "monitoring_system",
      collection_timestamp: new Date().toISOString(),
      status: "unknown",
    };
  }
  return await DiscussionBoardSystemHealthMetricAtSummaryTransformer.transform(
    fallbackMetric,
  );
}
