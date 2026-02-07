import { ICommunityPlatformSystemMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformSystemMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSystemMetric";
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

export async function patchCommunityPlatformAdminSystemMetrics(props: {
  admin: AdminPayload;
  body: ICommunityPlatformSystemMetric.IRequest;
}): Promise<IPageICommunityPlatformSystemMetric.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  if (page < 1) {
    throw new HttpException("Page must be at least 1", 400);
  }
  if (limit < 1 || limit > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }
  const now = new Date();
  const start = new Date(props.body.start_date);
  const end = new Date(props.body.end_date);
  if (start > now) {
    throw new HttpException("Start date cannot be in the future", 400);
  }
  if (end > now) {
    throw new HttpException("End date cannot be in the future", 400);
  }
  if (end < start) {
    throw new HttpException("End date must be after start date", 400);
  }
  const daysDifference =
    (now.getTime() - end.getTime()) / (24 * 60 * 60 * 1000);
  if (daysDifference > 30) {
    throw new HttpException("Date range must be within the last 30 days", 400);
  }
  const metrics =
    await MyGlobal.prisma.community_platform_system_metrics.findMany({
      where: {
        deleted_at: null,
        timestamp: {
          gte: props.body.start_date,
          lte: props.body.end_date,
        },
        ...(props.body.metric_type && { metric_type: props.body.metric_type }),
      },
      skip,
      take: limit,
      orderBy: { timestamp: "asc" },
    });
  const total = await MyGlobal.prisma.community_platform_system_metrics.count({
    where: {
      deleted_at: null,
      timestamp: {
        gte: props.body.start_date,
        lte: props.body.end_date,
      },
      ...(props.body.metric_type && { metric_type: props.body.metric_type }),
    },
  });
  const transformedMetrics = metrics.map((metric) => ({
    id: metric.id,
    metric_type: metric.metric_type,
    value: metric.value,
    timestamp: toISOStringSafe(metric.timestamp),
    created_at: toISOStringSafe(metric.created_at),
    updated_at: toISOStringSafe(metric.updated_at),
    deleted_at: metric.deleted_at ? toISOStringSafe(metric.deleted_at) : null,
  }));
  return {
    data: transformedMetrics,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
