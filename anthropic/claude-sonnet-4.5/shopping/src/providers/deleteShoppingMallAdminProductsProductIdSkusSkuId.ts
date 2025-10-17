import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminProductsProductIdSkusSkuId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  skuId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, productId, skuId } = props;

  // Step 1: Verify SKU exists and belongs to specified product
  const sku = await MyGlobal.prisma.shopping_mall_skus.findUnique({
    where: { id: skuId },
    include: { product: true },
  });

  if (!sku) {
    throw new HttpException("SKU not found", 404);
  }

  // Verify SKU belongs to the specified product
  if (sku.shopping_mall_product_id !== productId) {
    throw new HttpException("SKU does not belong to specified product", 400);
  }

  // Step 2: Check if SKU is referenced in existing orders
  const orderItemCount = await MyGlobal.prisma.shopping_mall_order_items.count({
    where: { shopping_mall_sku_id: skuId },
  });

  if (orderItemCount > 0) {
    throw new HttpException(
      "Cannot delete SKU: SKU is referenced in existing orders. Deletion blocked to preserve order history integrity.",
      409,
    );
  }

  // Step 3: Hard delete the SKU (schema has no deleted_at field)
  await MyGlobal.prisma.shopping_mall_skus.delete({
    where: { id: skuId },
  });
}
