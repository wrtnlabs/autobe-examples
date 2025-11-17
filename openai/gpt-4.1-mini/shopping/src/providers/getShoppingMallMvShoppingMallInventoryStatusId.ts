import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallMvShoppingMallInventoryStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMvShoppingMallInventoryStatus";

export async function getShoppingMallMvShoppingMallInventoryStatusId(props: {
  id: string & tags.Format<"uuid">;
}): Promise<IShoppingMallMvShoppingMallInventoryStatus> {
  const record =
    await MyGlobal.prisma.mv_shopping_mall_inventory_status.findUnique({
      where: { id: props.id },
    });

  if (!record) {
    throw new HttpException("Inventory status record not found", 404);
  }

  return {
    id: record.id,
    category_id: record.category_id,
    total_sku_count: record.total_sku_count,
    total_inventory_quantity: record.total_inventory_quantity,
    low_stock_threshold: record.low_stock_threshold,
    low_stock_sku_count: record.low_stock_sku_count,
    last_refreshed_at: toISOStringSafe(record.last_refreshed_at),
  };
}
