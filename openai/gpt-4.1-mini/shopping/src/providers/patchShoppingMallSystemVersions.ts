import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSystemVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSystemVersion";
import { IShoppingMallSystemVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemVersion";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSystemVersions(props: {
  body: IShoppingMallSystemVersion.IRequest;
}): Promise<IPageIShoppingMallSystemVersion.ISummary> {
  const { page = 1, limit = 100 } = props.body as any;
  if (page < 1) {
    throw new HttpException("Page must be greater than 0", 400);
  }
  if (limit < 1) {
    throw new HttpException("Limit must be greater than 0", 400);
  }
  const whereConditions: Prisma.shopping_mall_system_versionsWhereInput = {};
  const skip = (page - 1) * limit;
  const records = await MyGlobal.prisma.shopping_mall_system_versions.findMany({
    where: whereConditions,
    orderBy: { created_at: "desc" },
    skip,
    take: limit,
  });
  const total = await MyGlobal.prisma.shopping_mall_system_versions.count({
    where: whereConditions,
  });
  return {
    data: records.map((record) => ({
      id: record.id,
      entityName: record.entity_name,
      entityId: record.entity_id,
      versionNumber: record.version_number,
      changedFields: record.changed_fields ?? [],
      changeDescription: record.change_description ?? null,
      changedBy: record.changed_by,
      createdAt: toISOStringSafe(record.created_at),
      updatedAt: toISOStringSafe(record.updated_at),
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
