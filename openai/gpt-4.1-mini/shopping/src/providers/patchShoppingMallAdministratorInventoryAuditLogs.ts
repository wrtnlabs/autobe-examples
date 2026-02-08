import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryHistory";
import { IShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryHistory";
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

export async function patchShoppingMallAdministratorInventoryAuditLogs(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallInventoryHistory.IRequest;
}): Promise<IPageIShoppingMallInventoryHistory.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = 0;
  const [records, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_inventory_histories.findMany({
      where: { deleted_at: null },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_inventory_histories.count({
      where: { deleted_at: null },
    }),
  ]);
  return {
    data: records.map((record) => ({
      id: record.id,
      shopping_mall_product_variant_id: record.shopping_mall_product_variant_id,
      quantity_delta: record.quantity_delta,
      reason: record.reason,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
      deleted_at:
        record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
