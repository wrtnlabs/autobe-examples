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

export async function putShoppingMallSellerSaleSkusSaleSkuIdInventoryStock(props: {
  seller: SellerPayload;
  saleSkuId: string & tags.Format<"uuid">;
  body: IShoppingMallInventoryStock.IUpdate;
}): Promise<IShoppingMallInventoryStock> {
  const sku = await MyGlobal.prisma.shopping_mall_sale_skus.findUnique({
    where: { id: props.saleSkuId },
  });

  if (!sku) {
    throw new HttpException("SKU not found", 404);
  }

  const sale = await MyGlobal.prisma.shopping_mall_sales.findUnique({
    where: { id: sku.shopping_mall_sale_id },
  });

  if (!sale) {
    throw new HttpException("Sale not found", 404);
  }

  if (sale.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }

  const existingStock =
    await MyGlobal.prisma.shopping_mall_inventory_stocks.findUnique({
      where: { shopping_mall_sale_sku_id: props.saleSkuId },
    });

  if (!existingStock) {
    throw new HttpException("Inventory stock not found", 404);
  }

  if (
    props.body.total_quantity !== undefined &&
    props.body.total_quantity < existingStock.reserved_quantity
  ) {
    throw new HttpException(
      "Total quantity cannot be less than reserved quantity",
      400,
    );
  }

  const updated = await MyGlobal.prisma.shopping_mall_inventory_stocks.update({
    where: { shopping_mall_sale_sku_id: props.saleSkuId },
    data: {
      ...(props.body.total_quantity !== undefined && {
        total_quantity: props.body.total_quantity,
        available_quantity:
          props.body.total_quantity - existingStock.reserved_quantity,
      }),
      ...(props.body.low_stock_threshold !== undefined && {
        low_stock_threshold: props.body.low_stock_threshold,
      }),
      updated_at: new Date(),
    },
  });

  return {
    id: updated.id,
    shopping_mall_sale_sku_id: updated.shopping_mall_sale_sku_id,
    total_quantity: updated.total_quantity,
    reserved_quantity: updated.reserved_quantity,
    available_quantity: updated.available_quantity,
    low_stock_threshold: updated.low_stock_threshold,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
