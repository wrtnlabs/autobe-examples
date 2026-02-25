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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceSuperAdministratorCacheConfigurationsConfigIdParameters(props: {
  superAdministrator: SuperadministratorPayload;
  configId: string & tags.Format<"uuid">;
  body: IEcommerceCacheConfigurationParameter.IRequest;
}): Promise<IPageIEcommerceCacheConfigurationParameter.ISummary> {
  // Verify cache configuration exists
  const config =
    await MyGlobal.prisma.ecommerce_cache_configurations.findUnique({
      where: { id: props.configId, deleted_at: null },
      select: { id: true },
    });
  if (!config) {
    throw new HttpException("Cache configuration not found", 404);
  }
  // Build WHERE clause for cache configuration parameters
  const whereInput = {
    ecommerce_cache_configuration_id: props.configId,
    deleted_at: null,
    ...(props.body.metric_name && {
      parameterDefinition: {
        parameter_name: { contains: props.body.metric_name },
      },
    }),
    ...(props.body.metric_category && {
      parameterDefinition: {
        data_type: { contains: props.body.metric_category },
      },
    }),
    ...(props.body.collection_timestamp_start &&
      props.body.collection_timestamp_end && {
        created_at: {
          gte: props.body.collection_timestamp_start,
          lte: props.body.collection_timestamp_end,
        },
      }),
    ...(props.body.is_aggregated !== undefined && {
      parameterDefinition: {
        is_required: props.body.is_aggregated,
      },
    }),
  } satisfies Prisma.ecommerce_cache_configuration_parametersWhereInput;
  // Pagination setup
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Get data with pagination
  const data =
    await MyGlobal.prisma.ecommerce_cache_configuration_parameters.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        parameter_value: true,
        created_at: true,
        parameterDefinition: {
          select: {
            parameter_name: true,
            data_type: true,
            description: true,
          },
        },
      },
    });
  // Get total count
  const total =
    await MyGlobal.prisma.ecommerce_cache_configuration_parameters.count({
      where: whereInput,
    });
  // Transform data to match IEcommerceCacheConfigurationParameter.ISummary
  const transformedData = data.map(
    (item) =>
      ({
        id: item.id,
        metric_name: item.parameterDefinition.parameter_name,
        metric_value: parseFloat(item.parameter_value) || 0,
        metric_unit: item.parameterDefinition.data_type,
        collection_timestamp: item.created_at.toISOString(),
        metric_category: "cache_configuration",
        is_aggregated: false,
      }) satisfies IEcommerceCacheConfigurationParameter.ISummary,
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
