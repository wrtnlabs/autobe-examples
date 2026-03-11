import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoPerformanceMetric";
import { IMultiUserTodoSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoSystemConfiguration";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMultiUserTodoPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoPerformanceMetric";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { MultiUserTodoPerformanceMetricAtSummaryTransformer } from "../transformers/MultiUserTodoPerformanceMetricAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMultiUserTodoAdminPerformanceMetrics(props: {
  admin: AdminPayload;
  body: IMultiUserTodoPerformanceMetric.IRequest;
}): Promise<IPageIMultiUserTodoPerformanceMetric.ISummary> {
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;
  // Build WHERE conditions
  const whereConditions: Prisma.multi_user_todo_performance_metricsWhereInput =
    {};
  if (props.body.metric_type !== undefined && props.body.metric_type !== null) {
    whereConditions.metric_type = props.body.metric_type;
  }
  if (
    props.body.service_name !== undefined &&
    props.body.service_name !== null
  ) {
    whereConditions.service_name = {
      contains: props.body.service_name,
      mode: "insensitive" as const,
    } satisfies Prisma.StringFilter;
  }
  if (
    props.body.endpoint_path !== undefined &&
    props.body.endpoint_path !== null
  ) {
    whereConditions.endpoint_path = {
      contains: props.body.endpoint_path,
      mode: "insensitive" as const,
    } satisfies Prisma.StringFilter;
  }
  // Handle timestamp range filters
  if (
    (props.body.collection_timestamp_start !== undefined &&
      props.body.collection_timestamp_start !== null) ||
    (props.body.collection_timestamp_end !== undefined &&
      props.body.collection_timestamp_end !== null)
  ) {
    const timestampFilter: Prisma.DateTimeFilter = {};
    if (
      props.body.collection_timestamp_start !== undefined &&
      props.body.collection_timestamp_start !== null
    ) {
      // Prisma DateTimeFilter expects Date objects for filtering
      timestampFilter.gte = new Date(props.body.collection_timestamp_start);
    }
    if (
      props.body.collection_timestamp_end !== undefined &&
      props.body.collection_timestamp_end !== null
    ) {
      // Prisma DateTimeFilter expects Date objects for filtering
      timestampFilter.lte = new Date(props.body.collection_timestamp_end);
    }
    whereConditions.collection_timestamp = timestampFilter;
  }
  // Determine sort order
  const orderByCondition: Prisma.multi_user_todo_performance_metricsOrderByWithRelationInput =
    props.body.sort === "timestamp_asc"
      ? { collection_timestamp: "asc" as const }
      : { collection_timestamp: "desc" as const };
  // Execute queries
  const [data, total] = await Promise.all([
    MyGlobal.prisma.multi_user_todo_performance_metrics.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: orderByCondition,
      ...MultiUserTodoPerformanceMetricAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.multi_user_todo_performance_metrics.count({
      where: whereConditions,
    }),
  ]);
  // Transform data
  const transformedData = await ArrayUtil.asyncMap(
    data,
    MultiUserTodoPerformanceMetricAtSummaryTransformer.transform,
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
