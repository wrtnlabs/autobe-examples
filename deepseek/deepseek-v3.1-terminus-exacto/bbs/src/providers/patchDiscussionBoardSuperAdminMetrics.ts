import { IDiscussionBoardSystemHealthMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemHealthMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardSystemHealthMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemHealthMetric";
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

export async function patchDiscussionBoardSuperAdminMetrics(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardSystemHealthMetric.IRequest;
}): Promise<IPageIDiscussionBoardSystemHealthMetric.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...(props.body.metric_type !== undefined && {
      metric_type: props.body.metric_type,
    }),
    ...(props.body.source_service !== undefined && {
      source_service: props.body.source_service,
    }),
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.start_timestamp !== undefined && {
      collection_timestamp: { gte: new Date(props.body.start_timestamp) },
    }),
    ...(props.body.end_timestamp !== undefined && {
      collection_timestamp: { lte: new Date(props.body.end_timestamp) },
    }),
  } satisfies Prisma.discussion_board_system_health_metricsWhereInput;
  const orderByInput = {
    collection_timestamp: "desc" as const,
  } satisfies Prisma.discussion_board_system_health_metricsOrderByWithRelationInput;
  const data =
    await MyGlobal.prisma.discussion_board_system_health_metrics.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...DiscussionBoardSystemHealthMetricAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.discussion_board_system_health_metrics.count({
      where: whereInput,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      DiscussionBoardSystemHealthMetricAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
