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

export async function patchDiscussionBoardSuperAdminSystemMetrics(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardSystemHealthMetric.IRequest;
}): Promise<IPageIDiscussionBoardSystemHealthMetric.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build date range condition
  const dateRangeCondition: Prisma.DateTimeFilter<"discussion_board_system_health_metrics"> =
    {};
  if (props.body.start_timestamp !== undefined) {
    dateRangeCondition.gte = props.body.start_timestamp;
  }
  if (props.body.end_timestamp !== undefined) {
    dateRangeCondition.lte = props.body.end_timestamp;
  }
  const whereInput = {
    deleted_at: null,
    ...(props.body.metric_type !== undefined && {
      metric_type: props.body.metric_type,
    }),
    ...(props.body.source_service !== undefined && {
      source_service: props.body.source_service,
    }),
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...((props.body.start_timestamp !== undefined ||
      props.body.end_timestamp !== undefined) && {
      collection_timestamp: dateRangeCondition,
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
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardSystemHealthMetricAtSummaryTransformer.transform,
  );
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
