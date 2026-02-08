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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorSystemVersionsChangelog(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallSystemVersion.IRequest;
}): Promise<IPageIShoppingMallSystemVersion.ISummary> {
  // Pagination defaults
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // No filtering because body properties for filtering don't exist in IRequest type
  const where: Prisma.shopping_mall_system_versionsWhereInput = {};
  const data = await MyGlobal.prisma.shopping_mall_system_versions.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
  });
  const total = await MyGlobal.prisma.shopping_mall_system_versions.count({
    where,
  });
  return {
    data: data.map((record) => ({
      id: record.id,
      entity_name: record.entity_name,
      changed_fields: record.changed_fields,
      version_number: record.version_number,
      changed_by: record.changed_by,
      created_at: toISOStringSafe(record.created_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}
