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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchDiscussionBoardSuperAdminPerformanceMetrics(props: {
  superAdmin: SuperAdminPayload;
  body: IDiscussionBoardPerformanceMetric.IRequest;
}): Promise<IPageIDiscussionBoardPerformanceMetric.ISummary> {
  // Set pagination parameters
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.max(1, Math.min(100, props.body.limit ?? 20));
  const skip = (page - 1) * limit;
  // Build WHERE clause with proper type handling
  const whereInput = {
    ...(props.body.metric_type && { metric_type: props.body.metric_type }),
    ...(props.body.source_component && {
      source_component: props.body.source_component,
    }),
    ...(props.body.collection_timestamp_start && {
      collection_timestamp: {
        gte: new Date(props.body.collection_timestamp_start),
      },
    }),
    ...(props.body.collection_timestamp_end && {
      collection_timestamp: {
        lte: new Date(props.body.collection_timestamp_end),
      },
    }),
  } satisfies Prisma.discussion_board_performance_metricsWhereInput;
  // Set default sort order to desc (most recent first)
  const orderByInput =
    props.body.sort === "asc"
      ? { collection_timestamp: "asc" as const }
      : { collection_timestamp: "desc" as const };
  // Execute queries sequentially for consistency
  const data =
    await MyGlobal.prisma.discussion_board_performance_metrics.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      select: {
        id: true,
        metric_type: true,
        metric_value: true,
        metric_unit: true,
        source_component: true,
        collection_timestamp: true,
      },
    });
  const total =
    await MyGlobal.prisma.discussion_board_performance_metrics.count({
      where: whereInput,
    });
  // Transform data manually since we don't have a transformer
  const transformedData = data.map((item) => ({
    id: item.id,
    metric_type: item.metric_type,
    metric_value: item.metric_value,
    metric_unit: item.metric_unit,
    source_component: item.source_component,
    collection_timestamp: item.collection_timestamp.toISOString(),
  }));
  return {
    data: transformedData,
    pagination: {
      current: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
        page,
      ),
      limit: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(limit),
      records: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
        total,
      ),
      pages: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
        Math.ceil(total / limit),
      ),
    } satisfies IPage.IPagination,
  };
}
