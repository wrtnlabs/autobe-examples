import { ICommunityPlatformSystemMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getCommunityPlatformAdminSystemMetricsSummary(props: {
  admin: AdminPayload;
}): Promise<ICommunityPlatformSystemMetric.ISummary[]> {
  const twentyFourHoursAgo = new Date();
  twentyFourHoursAgo.setTime(
    twentyFourHoursAgo.getTime() - 24 * 60 * 60 * 1000,
  );
  const cutoffDate = toISOStringSafe(twentyFourHoursAgo);
  const metrics =
    await MyGlobal.prisma.community_platform_system_metrics.groupBy({
      by: ["metric_type"],
      where: { timestamp: { gte: cutoffDate }, deleted_at: null },
      _avg: { value: true },
    });
  return metrics.map((metric) => ({
    metric_type: metric.metric_type,
    value: metric._avg?.value ?? 0,
    aggregate_timestamp: cutoffDate,
    aggregate_created_at: cutoffDate,
    aggregate_updated_at: cutoffDate,
    deleted_at: null,
    id: v4() as string & tags.Format<"uuid">,
    timestamp: cutoffDate,
    created_at: cutoffDate,
    updated_at: cutoffDate,
  }));
}
