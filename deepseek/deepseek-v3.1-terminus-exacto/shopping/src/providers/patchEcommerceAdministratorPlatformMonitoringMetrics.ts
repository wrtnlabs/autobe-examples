import { IEcommerceCacheConfigurationParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationParameter";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceCacheConfigurationParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCacheConfigurationParameter";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdministratorPlatformMonitoringMetrics(props: {
  administrator: AdministratorPayload;
  body: IEcommerceCacheConfigurationParameter.IRequest;
}): Promise<IPageIEcommerceCacheConfigurationParameter.ISummary> {
  // Validate administrator session
  const administrator =
    await MyGlobal.prisma.ecommerce_administrators.findFirst({
      where: { id: props.administrator.id, deleted_at: null },
    });
  if (!administrator) {
    throw new HttpException("Administrator not found", 404);
  }
  // Set pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Validate timestamp parameters if provided
  if (props.body.collection_timestamp_start) {
    typia.assert<typeof props.body.collection_timestamp_start>(
      props.body.collection_timestamp_start,
    );
  }
  if (props.body.collection_timestamp_end) {
    typia.assert<typeof props.body.collection_timestamp_end>(
      props.body.collection_timestamp_end,
    );
  }
  // Build where clause without Date objects
  const whereClause = {
    ...(props.body.metric_name && {
      metric_name: {
        contains: props.body.metric_name,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.metric_category && {
      metric_category: props.body.metric_category,
    }),
    ...(props.body.collection_timestamp_start &&
      props.body.collection_timestamp_end && {
        collection_timestamp: {
          gte: props.body.collection_timestamp_start,
          lte: props.body.collection_timestamp_end,
        },
      }),
    ...(props.body.collection_timestamp_start &&
      !props.body.collection_timestamp_end && {
        collection_timestamp: { gte: props.body.collection_timestamp_start },
      }),
    ...(props.body.collection_timestamp_end &&
      !props.body.collection_timestamp_start && {
        collection_timestamp: { lte: props.body.collection_timestamp_end },
      }),
    ...(props.body.is_aggregated !== undefined && {
      is_aggregated: props.body.is_aggregated,
    }),
  } satisfies Prisma.ecommerce_platform_monitoring_metricsWhereInput;
  // Execute queries
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_platform_monitoring_metrics.findMany({
      where: whereClause,
      orderBy: { collection_timestamp: "desc" as const },
      skip,
      take: limit,
      select: {
        id: true,
        metric_name: true,
        metric_value: true,
        metric_unit: true,
        collection_timestamp: true,
        metric_category: true,
        is_aggregated: true,
      },
    }),
    MyGlobal.prisma.ecommerce_platform_monitoring_metrics.count({
      where: whereClause,
    }),
  ]);
  // Transform data to match DTO format
  const transformedData: IEcommerceCacheConfigurationParameter.ISummary[] =
    data.map((metric) => ({
      id: metric.id,
      metric_name: metric.metric_name,
      metric_value: metric.metric_value,
      metric_unit: metric.metric_unit,
      collection_timestamp: toISOStringSafe(metric.collection_timestamp),
      metric_category: metric.metric_category,
      is_aggregated: metric.is_aggregated,
    }));
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
