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

export async function patchDiscussionBoardSuperAdminAdministrationsAnalytics(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardSystemHealthMetric.IRequest;
}): Promise<IPageIDiscussionBoardSystemHealthMetric.ISummary> {
  // Parse pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build timestamp filter
  const timestampFilter: Prisma.DateTimeFilter | undefined =
    props.body.start_timestamp || props.body.end_timestamp
      ? {
          ...(props.body.start_timestamp && {
            gte: new Date(props.body.start_timestamp),
          }),
          ...(props.body.end_timestamp && {
            lte: new Date(props.body.end_timestamp),
          }),
        }
      : undefined;
  // Build where clause
  const whereInput = {
    deleted_at: null,
    ...(props.body.metric_type && { metric_type: props.body.metric_type }),
    ...(props.body.source_service && {
      source_service: props.body.source_service,
    }),
    ...(props.body.status && { status: props.body.status }),
    ...(timestampFilter && { collection_timestamp: timestampFilter }),
  } satisfies Prisma.discussion_board_system_health_metricsWhereInput;
  // Execute queries
  const data =
    await MyGlobal.prisma.discussion_board_system_health_metrics.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { collection_timestamp: "desc" },
      ...DiscussionBoardSystemHealthMetricAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.discussion_board_system_health_metrics.count({
      where: whereInput,
    });
  // Transform data
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardSystemHealthMetricAtSummaryTransformer.transform,
  );
  // Calculate pages
  const pages = limit > 0 ? Math.ceil(total / limit) : 0;
  // Return paginated response
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
  };
}
