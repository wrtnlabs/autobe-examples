import { IEcommerceCacheConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfiguration";
import { IEcommerceCacheConfigurationParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationParameter";
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
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceSuperAdministratorCacheConfigurations(props: {
  superAdministrator: SuperadministratorPayload;
  body: IEcommerceCacheConfigurationParameter;
}): Promise<IPageIEcommerceCacheConfiguration> {
  // Extract pagination parameters with defaults
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause based on available filter criteria
  const whereInput: Prisma.ecommerce_cache_configurationsWhereInput = {
    deleted_at: null,
  };
  // Since IEcommerceCacheConfigurationParameter appears to be a parameter value DTO rather than search DTO,
  // we'll implement basic pagination without complex filtering for now
  // In a real implementation, we would need a proper search DTO structure
  // Execute paginated query
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_cache_configurations.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        cache_key: true,
        cache_type: true,
        is_active: true,
        priority: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.ecommerce_cache_configurations.count({
      where: whereInput,
    }),
  ]);
  // Transform database results to DTO format
  const transformedData = data.map((item) => ({
    id: item.id as string & tags.Format<"uuid">,
    cache_key: item.cache_key,
    cache_type: item.cache_type,
    is_active: item.is_active,
    priority: item.priority,
    created_at: toISOStringSafe(item.created_at) as string &
      tags.Format<"date-time">,
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
