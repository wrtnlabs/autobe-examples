import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventory";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingMallSellerInventorySkuId(props: {
  seller: SellerPayload;
  skuId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallInventory> {
  const { seller, skuId } = props;

  // Find the SKU without invalid nested select
  const sku = await MyGlobal.prisma.shopping_mall_skus.findUnique({
    where: { id: skuId },
    select: {
      id: true,
      shopping_mall_product_id: true,
      status: true,
    },
  });

  if (!sku) {
    throw new HttpException("SKU not found", 404);
  }

  // Find the related product to check seller ownership
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: sku.shopping_mall_product_id },
    select: {
      shopping_mall_seller_id: true,
    },
  });

  if (!product) {
    throw new HttpException("Product not found", 404);
  }

  if (product.shopping_mall_seller_id !== seller.id) {
    throw new HttpException("Forbidden: Seller does not own this SKU", 403);
  }

  // Find inventory for the SKU
  const inventory = await MyGlobal.prisma.shopping_mall_inventory.findUnique({
    where: { shopping_mall_sku_id: skuId },
  });

  if (!inventory) {
    throw new HttpException("Inventory not found", 404);
  }

  return {
    id: inventory.id,
    shopping_mall_sku_id: inventory.shopping_mall_sku_id,
    quantity: inventory.quantity,
    created_at: toISOStringSafe(inventory.created_at),
    updated_at: toISOStringSafe(inventory.updated_at),
  };
}
