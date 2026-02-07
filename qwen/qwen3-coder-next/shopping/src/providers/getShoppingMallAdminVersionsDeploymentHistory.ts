import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSystematicVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSystematicVersion";
import { IShoppingMallSystematicVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystematicVersion";
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

export async function getShoppingMallAdminVersionsDeploymentHistory(props: {
  admin: AdminPayload;
}): Promise<IPageIShoppingMallSystematicVersion> {
  const page = 1;
  const limit = 10;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.shopping_mall_systematic_versions.findMany(
    {
      skip,
      take: limit,
      orderBy: { migration_timestamp: "desc" },
    },
  );
  const total = await MyGlobal.prisma.shopping_mall_systematic_versions.count({
    where: { deleted_at: null },
  });
  return {
    data: data.map((record) => ({
      id: record.id,
      component_name: record.component_name,
      version_number: record.version_number,
      migration_timestamp: record.migration_timestamp,
      description: record.description,
      is_active: record.is_active,
      created_at: toISOStringSafe(record.created_at),
      updated_at:
        record.updated_at === null ? null : toISOStringSafe(record.updated_at),
      deleted_at:
        record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
