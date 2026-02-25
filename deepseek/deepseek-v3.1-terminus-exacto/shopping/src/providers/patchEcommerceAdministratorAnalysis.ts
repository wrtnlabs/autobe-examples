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

export async function patchEcommerceAdministratorAnalysis(props: {
  administrator: AdministratorPayload;
  body: IEcommerceCacheConfigurationParameter.IRequest;
}): Promise<IPageIEcommerceCacheConfigurationParameter.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  const whereInput = {
    ...(props.body.metric_name && {
      metric_name: { contains: props.body.metric_name, mode: "insensitive" },
    }),
    ...(props.body.metric_category && {
      metric_category: props.body.metric_category,
    }),
    ...(props.body.is_aggregated !== undefined && {
      is_aggregated: props.body.is_aggregated,
    }),
  } satisfies Prisma.ecommerce_platform_monitoring_metricsWhereInput;
  const data =
    await MyGlobal.prisma.ecommerce_platform_monitoring_metrics.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { collection_timestamp: "desc" },
    });
  const total =
    await MyGlobal.prisma.ecommerce_platform_monitoring_metrics.count({
      where: whereInput,
    });
  const transformedData: IEcommerceCacheConfigurationParameter.ISummary[] =
    data.map((metric) => ({
      id: metric.id as string & tags.Format<"uuid">,
      metric_name: metric.metric_name,
      metric_value: metric.metric_value,
      metric_unit: metric.metric_unit,
      collection_timestamp:
        metric.collection_timestamp.toISOString() as string &
          tags.Format<"date-time">,
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
