import { IEcommerceCacheConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceCacheConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCacheConfiguration";
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

export async function patchEcommerceAdministratorCacheConfigurations(props: {
  administrator: AdministratorPayload;
  body: IEcommerceCacheConfiguration.IRequest;
}): Promise<IPageIEcommerceCacheConfiguration.ISummary> {
  // Validate and set pagination parameters
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.min(Math.max(1, props.body.limit ?? 100), 100);
  const skip = (page - 1) * limit;
  // Build WHERE conditions using string comparisons for dates
  const whereConditions: Prisma.ecommerce_cache_configurationsWhereInput = {
    deleted_at: null,
    ...(props.body.search && {
      cache_key: { contains: props.body.search, mode: "insensitive" },
    }),
    ...(props.body.cache_type && { cache_type: props.body.cache_type }),
    ...(props.body.is_active !== undefined &&
      props.body.is_active !== null && {
        is_active: props.body.is_active,
      }),
    ...(props.body.priority_min !== undefined && {
      priority: { gte: props.body.priority_min },
    }),
    ...(props.body.priority_max !== undefined && {
      priority: { lte: props.body.priority_max },
    }),
    ...(props.body.created_at_start && {
      created_at: { gte: props.body.created_at_start },
    }),
    ...(props.body.created_at_end && {
      created_at: { lte: props.body.created_at_end },
    }),
    ...(props.body.updated_at_start && {
      updated_at: { gte: props.body.updated_at_start },
    }),
    ...(props.body.updated_at_end && {
      updated_at: { lte: props.body.updated_at_end },
    }),
  };
  // Execute queries sequentially (not in parallel)
  const data = await MyGlobal.prisma.ecommerce_cache_configurations.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
  });
  const total = await MyGlobal.prisma.ecommerce_cache_configurations.count({
    where: whereConditions,
  });
  // Transform data without type assertions
  const transformedData: IEcommerceCacheConfiguration.ISummary[] = data.map(
    (item) => ({
      id: item.id,
      cache_key: item.cache_key,
      cache_type: item.cache_type,
      is_active: item.is_active,
      priority: item.priority,
      created_at: toISOStringSafe(item.created_at),
    }),
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformedData,
  };
}
