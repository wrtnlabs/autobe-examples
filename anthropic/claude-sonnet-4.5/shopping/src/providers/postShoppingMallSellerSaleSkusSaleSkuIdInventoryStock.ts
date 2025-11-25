import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallInventoryStock } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryStock";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingMallSellerSaleSkusSaleSkuIdInventoryStock(props: {
  seller: SellerPayload;
  saleSkuId: string & tags.Format<"uuid">;
  body: IShoppingMallInventoryStock.ICreate;
}): Promise<IShoppingMallInventoryStock> {
  const sku = await MyGlobal.prisma.shopping_mall_sale_skus.findUnique({
    where: { id: props.saleSkuId },
    include: {
      sale: true,
    },
  });

  if (!sku) {
    throw new HttpException("Product SKU not found", 404);
  }

  if (sku.sale.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden: You do not own this product SKU", 403);
  }

  const existingStock =
    await MyGlobal.prisma.shopping_mall_inventory_stocks.findUnique({
      where: { shopping_mall_sale_sku_id: props.saleSkuId },
    });

  if (existingStock) {
    throw new HttpException("Inventory stock already exists for this SKU", 409);
  }

  const created = await MyGlobal.prisma.shopping_mall_inventory_stocks.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_sale_sku_id: props.saleSkuId,
      total_quantity: props.body.total_quantity,
      reserved_quantity: 0,
      available_quantity: props.body.total_quantity,
      low_stock_threshold: props.body.low_stock_threshold ?? 10,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    shopping_mall_sale_sku_id: created.shopping_mall_sale_sku_id,
    total_quantity: created.total_quantity,
    reserved_quantity: created.reserved_quantity,
    available_quantity: created.available_quantity,
    low_stock_threshold: created.low_stock_threshold,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
