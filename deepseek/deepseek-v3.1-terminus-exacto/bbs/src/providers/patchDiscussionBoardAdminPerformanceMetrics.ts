import { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import { IDiscussionBoardPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPerformanceMetric";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import { IPageIDiscussionBoardPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPerformanceMetric";
import { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardPerformanceMetricTransformer } from "../transformers/DiscussionBoardPerformanceMetricTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminPerformanceMetrics(props: {
  admin: AdminPayload;
  body: IDiscussionBoardPerformanceMetric.IRequest;
}): Promise<IPageIDiscussionBoardPerformanceMetric> {
  // Validate and set pagination parameters
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.min(Math.max(1, props.body.limit ?? 20), 100);
  const skip = (page - 1) * limit;
  // Build WHERE clause with filtering
  const whereInput: Prisma.discussion_board_performance_metricsWhereInput = {
    ...(props.body.metric_type && { metric_type: props.body.metric_type }),
    ...(props.body.source_component && {
      source_component: props.body.source_component,
    }),
  };
  // Handle date range filtering with string dates
  if (
    props.body.collection_timestamp_start ||
    props.body.collection_timestamp_end
  ) {
    const dateFilters: Record<string, unknown> = {};
    if (props.body.collection_timestamp_start) {
      dateFilters.gte = props.body.collection_timestamp_start;
    }
    if (props.body.collection_timestamp_end) {
      dateFilters.lte = props.body.collection_timestamp_end;
    }
    whereInput.collection_timestamp = dateFilters;
  }
  const orderByInput: Prisma.discussion_board_performance_metricsOrderByWithRelationInput =
    {
      collection_timestamp: props.body.sort === "asc" ? "asc" : "desc",
    };
  // Execute queries sequentially (better for database performance)
  const data =
    await MyGlobal.prisma.discussion_board_performance_metrics.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...DiscussionBoardPerformanceMetricTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.discussion_board_performance_metrics.count({
      where: whereInput,
    });
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardPerformanceMetricTransformer.transform,
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
