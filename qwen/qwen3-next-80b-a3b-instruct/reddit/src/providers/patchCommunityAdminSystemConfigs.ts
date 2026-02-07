import { ICommunitySystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySystemConfig";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunitySystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunitySystemConfig";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityAdminSystemConfigs(props: {
  admin: AdminPayload;
}): Promise<IPageICommunitySystemConfig.ISummary> {
  // Extract pagination parameters from request with defaults
  const page = 1; // Default value for page
  const limit = 100; // Default value for limit
  const skip = (page - 1) * limit;
  // Extract search/filter parameters from request
  const nameFilter = "";
  const typeFilter = "";
  const enabledFilter = null;
  // Build where clause for filtering - removed deleted_at since it doesn't exist in schema
  const whereClause: Prisma.community_system_configsWhereInput = {};
  if (nameFilter) {
    whereClause.name = { contains: nameFilter, mode: "insensitive" };
  }
  if (typeFilter) {
    whereClause.type = typeFilter;
  }
  if (enabledFilter !== null) {
    whereClause.enabled = enabledFilter;
  }
  // Fetch data with cursor-based pagination using created_at
  const data = await MyGlobal.prisma.community_system_configs.findMany({
    where: whereClause,
    orderBy: { created_at: "desc" },
    skip,
    take: limit,
    select: {
      name: true,
      value: true,
      type: true,
      enabled: true,
    },
  });
  // Count total records for pagination
  const total = await MyGlobal.prisma.community_system_configs.count({
    where: whereClause,
  });
  // Transform data to ICommunitySystemConfig.ISummary format
  const summaryData = data.map(
    (record) =>
      ({
        name: record.name,
        value: record.value,
        type: record.type,
        enabled: record.enabled,
      }) satisfies ICommunitySystemConfig.ISummary,
  );
  // Build pagination metadata
  const pagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  } satisfies IPage.IPagination;
  // Return paginated response
  return {
    data: summaryData,
    pagination,
  } satisfies IPageICommunitySystemConfig.ISummary;
}
