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
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminSystemMetricsPerformance(props: {
  superAdmin: SuperAdminPayload;
  body: IDiscussionBoardPerformanceMetric.IRequest;
}): Promise<IPageIDiscussionBoardPerformanceMetric.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build query conditions
  const whereConditions: Prisma.discussion_board_performance_metricsWhereInput =
    {
      ...(props.body.metric_type && { metric_type: props.body.metric_type }),
      ...(props.body.source_component && {
        source_component: props.body.source_component,
      }),
      ...(props.body.collection_timestamp_start &&
      props.body.collection_timestamp_end
        ? {
            collection_timestamp: {
              gte: new Date(props.body.collection_timestamp_start),
              lte: new Date(props.body.collection_timestamp_end),
            },
          }
        : props.body.collection_timestamp_start
          ? {
              collection_timestamp: {
                gte: new Date(props.body.collection_timestamp_start),
              },
            }
          : props.body.collection_timestamp_end
            ? {
                collection_timestamp: {
                  lte: new Date(props.body.collection_timestamp_end),
                },
              }
            : {}),
    };
  // Sort conditions
  const orderBy =
    props.body.sort === "asc"
      ? { collection_timestamp: Prisma.SortOrder.asc }
      : { collection_timestamp: Prisma.SortOrder.desc };
  // Parallel query for data and total count
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_performance_metrics.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.discussion_board_performance_metrics.count({
      where: whereConditions,
    }),
  ]);
  // Transform data manually since we don't have the transformer
  const transformedData = data.map((metric) => ({
    id: metric.id,
    metric_type: metric.metric_type,
    metric_value: metric.metric_value,
    metric_unit: metric.metric_unit,
    source_component: metric.source_component,
    collection_timestamp: metric.collection_timestamp.toISOString(),
  }));
  // Fix: Use correct IPage.IPagination property names - adjust based on actual interface
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  };
}
