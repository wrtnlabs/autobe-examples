import { IEcommerceSystemMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSystemMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceSystemMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSystemMetric";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceSystemMetricAtSummaryTransformer } from "../transformers/EcommerceSystemMetricAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdministratorSystemMetrics(props: {
  administrator: AdministratorPayload;
  body: IEcommerceSystemMetric.IRequest;
}): Promise<IPageIEcommerceSystemMetric.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  // Build where clause with proper datetime handling
  const whereClause: Prisma.ecommerce_system_metricsWhereInput = {};
  if (props.body.metric_name) {
    whereClause.metric_name = {
      contains: props.body.metric_name,
      mode: "insensitive",
    };
  }
  if (props.body.metric_category) {
    whereClause.metric_category = props.body.metric_category;
  }
  if (props.body.source_component) {
    whereClause.source_component = props.body.source_component;
  }
  if (props.body.environment) {
    whereClause.environment = props.body.environment;
  }
  if (props.body.threshold_exceeded !== undefined) {
    whereClause.threshold_exceeded = props.body.threshold_exceeded;
  }
  if (
    props.body.metric_value_min !== undefined ||
    props.body.metric_value_max !== undefined
  ) {
    whereClause.metric_value = {
      ...(props.body.metric_value_min !== undefined && {
        gte: props.body.metric_value_min,
      }),
      ...(props.body.metric_value_max !== undefined && {
        lte: props.body.metric_value_max,
      }),
    };
  }
  // Handle date range filtering without Date constructor
  const dateRangeFilter: {
    gte?: string;
    lte?: string;
  } = {};
  if (props.body.date_from !== undefined) {
    // Convert ISO string to database timestamp format
    dateRangeFilter.gte = props.body.date_from;
  }
  if (props.body.date_to !== undefined) {
    // Convert ISO string to database timestamp format
    dateRangeFilter.lte = props.body.date_to;
  }
  if (dateRangeFilter.gte !== undefined || dateRangeFilter.lte !== undefined) {
    whereClause.measurement_timestamp = dateRangeFilter;
  }
  // Use sequential database calls instead of Promise.all
  const data = await MyGlobal.prisma.ecommerce_system_metrics.findMany({
    where: whereClause,
    skip,
    take: limit,
    orderBy: { measurement_timestamp: "desc" },
    ...EcommerceSystemMetricAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_system_metrics.count({
    where: whereClause,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceSystemMetricAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
