import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallInventoryStock } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryStock";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingMallSellerSaleSkusSaleSkuIdInventoryStock(props: {
  seller: SellerPayload;
  saleSkuId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallInventoryStock> {
  const sku = await MyGlobal.prisma.shopping_mall_sale_skus.findUnique({
    where: { id: props.saleSkuId },
    include: { sale: true },
  });

  if (!sku) {
    throw new HttpException("SKU not found", 404);
  }

  if (sku.sale.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }

  const inventoryStock =
    await MyGlobal.prisma.shopping_mall_inventory_stocks.findFirst({
      where: {
        shopping_mall_sale_sku_id: props.saleSkuId,
        deleted_at: null,
      },
    });

  if (!inventoryStock) {
    throw new HttpException("Inventory stock not found", 404);
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
    deleted_at: inventoryStock.deleted_at
      ? toISOStringSafe(inventoryStock.deleted_at)
      : null,
  };
}
