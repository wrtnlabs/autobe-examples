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
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { EcommerceCacheConfigurationParameterAtSummaryTransformer } from "../transformers/EcommerceCacheConfigurationParameterAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceSuperAdministratorAnalysis(props: {
  superAdministrator: SuperadministratorPayload;
  body: IEcommerceCacheConfigurationParameter.IRequest;
}): Promise<IPageIEcommerceCacheConfigurationParameter.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    ...(props.body.metric_name && {
      metric_name: { contains: props.body.metric_name },
    }),
    ...(props.body.metric_category && {
      metric_category: props.body.metric_category,
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
    ...(props.body.is_aggregated !== undefined && {
      is_aggregated: props.body.is_aggregated,
    }),
  } satisfies Prisma.ecommerce_platform_monitoring_metricsWhereInput;
  const data =
    await MyGlobal.prisma.ecommerce_platform_monitoring_metrics.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { collection_timestamp: "desc" as const },
      ...EcommerceCacheConfigurationParameterAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.ecommerce_platform_monitoring_metrics.count({
      where: whereInput,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceCacheConfigurationParameterAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
