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
import { CommunityPlatformSystemMetricAtSummaryTransformer } from "../transformers/CommunityPlatformSystemMetricAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminMetrics(props: {
  admin: AdminPayload;
  body: ICommunityPlatformSystemMetric.IRequest;
}): Promise<IPageICommunityPlatformSystemMetric.ISummary> {
  // Build WHERE clause
  const where: Prisma.community_platform_system_metricsWhereInput = {
    ...(props.body.component && { component: props.body.component }),
    ...(props.body.metric_name && { metric_name: props.body.metric_name }),
    ...(props.body.aggregation_period && {
      aggregation_period: props.body.aggregation_period,
    }),
    ...(props.body.value_type && { value_type: props.body.value_type }),
    ...(props.body.period_start_gte && {
      period_start: {
        gte: new Date(props.body.period_start_gte),
      },
    }),
    ...(props.body.period_end_lte && {
      period_end: {
        lte: new Date(props.body.period_end_lte),
      },
    }),
  };
  // Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Execute queries
  const [data, total] = await Promise.all([
    MyGlobal.prisma.community_platform_system_metrics.findMany({
      where,
      skip,
      take: limit,
      orderBy: { period_start: "desc" as const },
      ...CommunityPlatformSystemMetricAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.community_platform_system_metrics.count({ where }),
  ]);
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformSystemMetricAtSummaryTransformer.transform,
  );
  // Return paginated response
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
