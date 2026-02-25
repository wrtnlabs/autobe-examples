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
import { EcommerceCacheConfigurationParameterTransformer } from "../transformers/EcommerceCacheConfigurationParameterTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdministratorCacheConfigurationsConfigIdParameters(props: {
  administrator: AdministratorPayload;
  configId: string & tags.Format<"uuid">;
  body: IEcommerceCacheConfigurationParameter.IRequest;
}): Promise<IPageIEcommerceCacheConfigurationParameter> {
  // Verify cache configuration exists
  const cacheConfig =
    await MyGlobal.prisma.ecommerce_cache_configurations.findUnique({
      where: { id: props.configId, deleted_at: null },
    });
  if (!cacheConfig) {
    throw new HttpException("Cache configuration not found", 404);
  }
  // Build parameterDefinition filter separately
  const parameterDefinitionFilter: Prisma.ecommerce_cache_configuration_parameter_definitionsWhereInput =
    {
      deleted_at: null,
    };
  // Apply filters based on actual schema fields
  if (props.body.metric_name) {
    parameterDefinitionFilter.parameter_name = {
      contains: props.body.metric_name,
    };
  }
  if (props.body.metric_category) {
    parameterDefinitionFilter.data_type = {
      contains: props.body.metric_category,
    };
  }
  // Build WHERE clause
  const whereInput: Prisma.ecommerce_cache_configuration_parametersWhereInput =
    {
      ecommerce_cache_configuration_id: props.configId,
      deleted_at: null,
      parameterDefinition: parameterDefinitionFilter,
    };
  // Handle date range filtering
  if (props.body.collection_timestamp_start) {
    whereInput.created_at = {
      gte: new Date(props.body.collection_timestamp_start),
    };
  }
  if (props.body.collection_timestamp_end) {
    if (
      whereInput.created_at &&
      typeof whereInput.created_at === "object" &&
      "gte" in whereInput.created_at
    ) {
      whereInput.created_at = {
        gte: whereInput.created_at.gte,
        lte: new Date(props.body.collection_timestamp_end),
      };
    } else {
      whereInput.created_at = {
        lte: new Date(props.body.collection_timestamp_end),
      };
    }
  }
  // Pagination settings
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  // Get data with pagination
  const data =
    await MyGlobal.prisma.ecommerce_cache_configuration_parameters.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceCacheConfigurationParameterTransformer.select(),
    });
  // Get total count
  const total =
    await MyGlobal.prisma.ecommerce_cache_configuration_parameters.count({
      where: whereInput,
    });
  // Transform data
  const transformedData = await Promise.all(
    data.map(EcommerceCacheConfigurationParameterTransformer.transform),
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
