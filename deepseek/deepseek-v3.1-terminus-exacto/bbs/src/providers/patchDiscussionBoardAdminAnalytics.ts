import { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import { IDiscussionBoardPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPerformanceMetric";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminAnalytics(props: {
  admin: AdminPayload;
  body: IDiscussionBoardPerformanceMetric.IRequest;
}): Promise<IPageIDiscussionBoardPerformanceMetric.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build WHERE conditions using ISO string comparison for dates
  const whereInput = {
    ...(props.body.metric_type && { metric_type: props.body.metric_type }),
    ...(props.body.source_component && {
      source_component: props.body.source_component,
    }),
    ...(props.body.collection_timestamp_start && {
      collection_timestamp: {
        gte: props.body.collection_timestamp_start,
      },
    }),
    ...(props.body.collection_timestamp_end && {
      collection_timestamp: {
        lte: props.body.collection_timestamp_end,
      },
    }),
  } satisfies Prisma.discussion_board_performance_metricsWhereInput;
  // Execute query with proper sorting
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_performance_metrics.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: {
        collection_timestamp: props.body.sort === "asc" ? "asc" : "desc",
      },
    }),
    MyGlobal.prisma.discussion_board_performance_metrics.count({
      where: whereInput,
    }),
  ]);
  // Transform data without type assertions
  const transformedData = data.map((metric) => ({
    id: metric.id as string,
    metric_type: metric.metric_type,
    metric_value: metric.metric_value,
    metric_unit: metric.metric_unit,
    source_component: metric.source_component,
    collection_timestamp: metric.collection_timestamp.toISOString(),
  }));
  // Build correct pagination hierarchy
  const basePagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  } satisfies IPage.IPagination;
  const adminDistStatPagination = {
    pagination: basePagination,
    data: [],
  } satisfies IPageIDiscussionBoardAdministratorDistributionStatistic.IPagination;
  const adminPromotionRequestPagination = {
    pagination: adminDistStatPagination,
    data: [],
  } satisfies IPageIDiscussionBoardAdministratorPromotionRequest.IPagination;
  const sectionPagination = {
    pagination: adminPromotionRequestPagination,
    data: [],
  } satisfies IPageIDiscussionBoardSection.IPagination;
  return {
    pagination: sectionPagination,
    data: transformedData,
  } satisfies IPageIDiscussionBoardPerformanceMetric.ISummary;
}
