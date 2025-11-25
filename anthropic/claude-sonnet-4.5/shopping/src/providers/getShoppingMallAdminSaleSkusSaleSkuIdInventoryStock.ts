import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallInventoryStock } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryStock";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminSaleSkusSaleSkuIdInventoryStock(props: {
  admin: AdminPayload;
  saleSkuId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallInventoryStock> {
  const inventoryStock =
    await MyGlobal.prisma.shopping_mall_inventory_stocks.findFirst({
      where: {
        shopping_mall_sale_sku_id: props.saleSkuId,
      },
    });

  if (!inventoryStock) {
    throw new HttpException(
      "Inventory stock not found for the specified SKU",
      404,
    );
  }

  return {
    id: inventoryStock.id,
    shopping_mall_sale_sku_id: inventoryStock.shopping_mall_sale_sku_id,
    total_quantity: inventoryStock.total_quantity,
    reserved_quantity: inventoryStock.reserved_quantity,
    available_quantity: inventoryStock.available_quantity,
    low_stock_threshold: inventoryStock.low_stock_threshold,
    created_at: toISOStringSafe(inventoryStock.created_at),
    updated_at: toISOStringSafe(inventoryStock.updated_at),
    deleted_at:
      inventoryStock.deleted_at === null
        ? undefined
        : toISOStringSafe(inventoryStock.deleted_at),
  };
}
