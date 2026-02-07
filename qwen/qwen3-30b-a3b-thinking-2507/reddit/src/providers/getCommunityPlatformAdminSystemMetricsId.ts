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

export async function getCommunityPlatformAdminSystemMetricsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformSystemMetric> {
  const metric =
    await MyGlobal.prisma.community_platform_system_metrics.findUnique({
      where: { id: props.id, deleted_at: null },
      select: {
        id: true,
        metric_type: true,
        value: true,
        timestamp: true,
        created_at: true,
        updated_at: true,
      },
    });
  if (!metric) {
    throw new HttpException("System metric not found", 404);
  }
  return {
    id: metric.id,
    metric_type: metric.metric_type,
    value: metric.value,
    timestamp: toISOStringSafe(metric.timestamp),
    created_at: toISOStringSafe(metric.created_at),
    updated_at: toISOStringSafe(metric.updated_at),
  };
}
