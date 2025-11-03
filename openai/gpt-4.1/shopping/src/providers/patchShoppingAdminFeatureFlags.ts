import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingFeatureFlag";
import { IPageIShoppingFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingFeatureFlag";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingAdminFeatureFlags(props: {
  admin: AdminPayload;
  body: IShoppingFeatureFlag.IRequest;
}): Promise<IPageIShoppingFeatureFlag.ISummary> {
  const { flagName, scope, enabled, page, limit, sortBy, order } = props.body;

  // Pagination defaults
  const queryPage = Number(page ?? 1);
  const queryLimit = Number(limit ?? 20);
  const skip = (queryPage - 1) * queryLimit;
  // Sort logic with allowed fields
  const allowedSorts = [
    "flag_name",
    "scope",
    "enabled",
    "rollout",
    "created_at",
  ];
  const sortField = allowedSorts.includes(sortBy ?? "") ? sortBy! : "flag_name";
  const sortDirection = order === "desc" ? "desc" : "asc";

  // Filtering: use partial match for flagName/scope, exact for enabled
  const where = {
    deleted_at: null,
    ...(flagName ? { flag_name: { contains: flagName } } : {}),
    ...(scope ? { scope: { contains: scope } } : {}),
    ...(enabled !== undefined ? { enabled } : {}),
  };

  // Query DB for paginated rows and total records (no Date type used)
  const [rows, records] = await Promise.all([
    MyGlobal.prisma.shopping_feature_flags.findMany({
      where,
      orderBy: { [sortField]: sortDirection },
      skip,
      take: queryLimit,
    }),
    MyGlobal.prisma.shopping_feature_flags.count({ where }),
  ]);

  return {
    pagination: {
      current: queryPage,
      limit: queryLimit,
      records,
      pages: Math.ceil(records / queryLimit),
    },
    data: rows.map((row) => ({
      id: row.id,
      flag_name: row.flag_name,
      scope: row.scope,
      enabled: row.enabled,
      rollout: row.rollout ?? null,
      description: row.description,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    })),
  };
}
