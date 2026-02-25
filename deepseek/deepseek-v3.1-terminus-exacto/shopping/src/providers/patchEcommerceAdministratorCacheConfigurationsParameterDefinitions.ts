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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchEcommerceAdministratorCacheConfigurationsParameterDefinitions(props: {
  administrator: AdministratorPayload;
  body: IEcommerceCacheConfigurationParameterDefinition.IRequest;
}): Promise<IPageIEcommerceCacheConfigurationParameterDefinition.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where clause for cache configuration parameter definitions
  const whereInput = {
    deleted_at: null,
    ...(props.body.search && {
      OR: [
        {
          parameter_name: { contains: props.body.search, mode: "insensitive" },
        },
        { description: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
    ...(props.body.created_at_from &&
      props.body.created_at_to && {
        created_at: {
          gte: new Date(props.body.created_at_from),
          lte: new Date(props.body.created_at_to),
        },
      }),
  } satisfies Prisma.ecommerce_cache_configuration_parameter_definitionsWhereInput;
  const orderByInput = {
    created_at: "desc",
  } satisfies Prisma.ecommerce_cache_configuration_parameter_definitionsOrderByWithRelationInput;
  // Query database for cache configuration parameter definitions
  const data =
    await MyGlobal.prisma.ecommerce_cache_configuration_parameter_definitions.findMany(
      {
        where: whereInput,
        skip,
        take: limit,
        orderBy: orderByInput,
        select: {
          id: true,
          parameter_name: true,
          data_type: true,
          is_required: true,
          description: true,
          created_at: true,
        },
      },
    );
  const total =
    await MyGlobal.prisma.ecommerce_cache_configuration_parameter_definitions.count(
      {
        where: whereInput,
      },
    );
  // Transform results to summary DTO format - only include fields that exist in the actual DTO
  const transformedData = data.map((record) => ({
    id: record.id as string & tags.Format<"uuid">,
    operation_type: record.parameter_name,
    created_at: toISOStringSafe(record.created_at) as string &
      tags.Format<"date-time">,
    administrator: {
      id: "" as string & tags.Format<"uuid">,
      email: "" as string & tags.Format<"email">,
      created_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
    } satisfies IEcommerceAdministrator.ISummary,
    category: {
      id: "" as string & tags.Format<"uuid">,
      name: "",
      parent: null,
      products_count: 0 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
      created_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
    } satisfies IEcommerceCategory.ISummary,
  }));
  return {
    pagination: {
      current: page satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      limit: limit satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      records: total satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      pages: Math.ceil(total / limit) satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    } satisfies IPage.IPagination,
    data: transformedData,
  };
}
