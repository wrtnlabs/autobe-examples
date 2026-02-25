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
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { EcommerceSystemMetricAtSummaryTransformer } from "../transformers/EcommerceSystemMetricAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceSuperAdministratorSystemMetrics(props: {
  superAdministrator: SuperadministratorPayload;
  body: IEcommerceSystemMetric.IRequest;
}): Promise<IPageIEcommerceSystemMetric.ISummary> {
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.min(100, Math.max(1, props.body.limit ?? 100));
  const skip = (page - 1) * limit;
  // Build WHERE clause based on filter criteria
  const whereInput = {
    ...(props.body.metric_name && {
      metric_name: { contains: props.body.metric_name },
    }),
    ...(props.body.metric_category && {
      metric_category: props.body.metric_category,
    }),
    ...(props.body.metric_value_min !== undefined &&
    props.body.metric_value_max !== undefined
      ? {
          metric_value: {
            gte: props.body.metric_value_min,
            lte: props.body.metric_value_max,
          },
        }
      : props.body.metric_value_min !== undefined
        ? { metric_value: { gte: props.body.metric_value_min } }
        : props.body.metric_value_max !== undefined
          ? { metric_value: { lte: props.body.metric_value_max } }
          : {}),
    ...(props.body.source_component && {
      source_component: props.body.source_component,
    }),
    ...(props.body.environment && { environment: props.body.environment }),
    ...(props.body.threshold_exceeded !== undefined && {
      threshold_exceeded: props.body.threshold_exceeded,
    }),
    ...(props.body.date_from && props.body.date_to
      ? {
          measurement_timestamp: {
            gte: new Date(props.body.date_from),
            lte: new Date(props.body.date_to),
          },
        }
      : props.body.date_from
        ? { measurement_timestamp: { gte: new Date(props.body.date_from) } }
        : props.body.date_to
          ? { measurement_timestamp: { lte: new Date(props.body.date_to) } }
          : {}),
  } satisfies Prisma.ecommerce_system_metricsWhereInput;
  const data = await MyGlobal.prisma.ecommerce_system_metrics.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { measurement_timestamp: "desc" },
    ...EcommerceSystemMetricAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_system_metrics.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceSystemMetricAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
