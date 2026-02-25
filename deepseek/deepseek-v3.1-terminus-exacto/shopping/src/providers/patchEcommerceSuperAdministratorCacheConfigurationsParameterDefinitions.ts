import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEcommerceCacheConfigurationParameterDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationParameterDefinition";
import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceCacheConfigurationParameterDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCacheConfigurationParameterDefinition";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { EcommerceCacheConfigurationParameterDefinitionAtSummaryTransformer } from "../transformers/EcommerceCacheConfigurationParameterDefinitionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceSuperAdministratorCacheConfigurationsParameterDefinitions(props: {
  superAdministrator: SuperadministratorPayload;
  body: IEcommerceCacheConfigurationParameterDefinition.IRequest;
}): Promise<IPageIEcommerceCacheConfigurationParameterDefinition.ISummary> {
  // Validate pagination parameters
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.min(Math.max(1, props.body.limit ?? 100), 100);
  const skip = (page - 1) * limit;
  // Build WHERE clause with only available properties
  const whereInput = {
    deleted_at: null,
  } satisfies Prisma.ecommerce_cache_configuration_parameter_definitionsWhereInput;
  // Use default sorting since sort property doesn't exist
  const orderByInput = {
    created_at: "desc" as const,
  } satisfies Prisma.ecommerce_cache_configuration_parameter_definitionsOrderByWithRelationInput;
  // Execute queries
  const data =
    await MyGlobal.prisma.ecommerce_cache_configuration_parameter_definitions.findMany(
      {
        where: whereInput,
        skip,
        take: limit,
        orderBy: orderByInput,
        ...EcommerceCacheConfigurationParameterDefinitionAtSummaryTransformer.select(),
      },
    );
  const total =
    await MyGlobal.prisma.ecommerce_cache_configuration_parameter_definitions.count(
      {
        where: whereInput,
      },
    );
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceCacheConfigurationParameterDefinitionAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
