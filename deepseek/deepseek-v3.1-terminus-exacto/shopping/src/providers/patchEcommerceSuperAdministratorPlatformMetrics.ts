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

export async function patchEcommerceSuperAdministratorPlatformMetrics(props: {
  superAdministrator: SuperadministratorPayload;
  body: IEcommerceCacheConfigurationParameter.IRequest;
}): Promise<IPageIEcommerceCacheConfigurationParameter.ISummary> {
  // Validate pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  if (page < 1) {
    throw new HttpException("Page must be at least 1", 400);
  }
  if (limit < 1 || limit > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }
  const skip = (page - 1) * limit;
  // Build WHERE clause
  const whereInput: Prisma.ecommerce_platform_monitoring_metricsWhereInput = {};
  // Filter by metric name (partial match)
  if (
    props.body.metric_name !== undefined &&
    props.body.metric_name.trim() !== ""
  ) {
    whereInput.metric_name = { contains: props.body.metric_name.trim() };
  }
  // Filter by metric category
  if (
    props.body.metric_category !== undefined &&
    props.body.metric_category.trim() !== ""
  ) {
    whereInput.metric_category = props.body.metric_category;
  }
  // Filter by collection timestamp range
  if (
    props.body.collection_timestamp_start !== undefined ||
    props.body.collection_timestamp_end !== undefined
  ) {
    whereInput.collection_timestamp = {};
    if (props.body.collection_timestamp_start !== undefined) {
      try {
        whereInput.collection_timestamp.gte = new Date(
          props.body.collection_timestamp_start,
        );
      } catch (error) {
        throw new HttpException(
          "Invalid collection_timestamp_start format",
          400,
        );
      }
    }
    if (props.body.collection_timestamp_end !== undefined) {
      try {
        whereInput.collection_timestamp.lte = new Date(
          props.body.collection_timestamp_end,
        );
      } catch (error) {
        throw new HttpException("Invalid collection_timestamp_end format", 400);
      }
    }
  }
  // Filter by aggregation status
  if (props.body.is_aggregated !== undefined) {
    whereInput.is_aggregated = props.body.is_aggregated;
  }
  // Execute queries
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_platform_monitoring_metrics.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { collection_timestamp: "desc" },
      ...EcommerceCacheConfigurationParameterAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_platform_monitoring_metrics.count({
      where: whereInput,
    }),
  ]);
  // Transform data
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceCacheConfigurationParameterAtSummaryTransformer.transform,
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
