import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingMallSellerProductsProductId(props: {
  seller: SellerPayload;
  productId: string;
  body: IShoppingMallProduct.IErase;
}): Promise<void> {
  // Step 1: Find product and verify it exists and is not deleted
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
    select: {
      id: true,
      shopping_mall_seller_id: true,
      deleted_at: true,
    },
  });
  if (product === null || product.deleted_at !== null) {
    throw new HttpException("Product not found", 404);
  }
  // Step 2: Verify seller ownership
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Get all active variants for this product
  const variants =
    await MyGlobal.prisma.shopping_mall_product_variants.findMany({
      where: {
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
      select: { id: true },
    });
  const variantIds = variants.map((v) => v.id);
  // Step 4: Check for blocking conditions
  if (variantIds.length > 0) {
    // Check for order items with paid or shipped status
    const pendingOrderItems =
      await MyGlobal.prisma.shopping_mall_order_items.count({
        where: {
          shopping_mall_product_variant_id: { in: variantIds },
          status: { in: ["paid", "shipped"] },
          deleted_at: null,
        },
      });
    if (pendingOrderItems > 0) {
      throw new HttpException(
        "Cannot delete product: pending order items exist",
        400,
      );
    }
    // Check for pending cancellation requests
    const pendingCancellations =
      await MyGlobal.prisma.shopping_mall_cancellation_requests.count({
        where: {
          orderItem: {
            shopping_mall_product_variant_id: { in: variantIds },
            deleted_at: null,
          },
          status: "pending",
        },
      });
    if (pendingCancellations > 0) {
      throw new HttpException(
        "Cannot delete product: pending cancellation requests exist",
        400,
      );
    }
    // Check for pending refund requests
    const pendingRefunds =
      await MyGlobal.prisma.shopping_mall_refund_requests.count({
        where: {
          orderItem: {
            shopping_mall_product_variant_id: { in: variantIds },
            deleted_at: null,
          },
          status: "pending",
        },
      });
    if (pendingRefunds > 0) {
      throw new HttpException(
        "Cannot delete product: pending refund requests exist",
        400,
      );
    }
  }
  // Step 5: Execute soft deletion with cascade
  const now = new Date();
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Soft delete the product
    await tx.shopping_mall_products.update({
      where: { id: props.productId },
      data: { deleted_at: now },
    });
    // Soft delete all variants
    await tx.shopping_mall_product_variants.updateMany({
      where: {
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
      data: { deleted_at: now },
    });
    // Hard delete wishlist items
    await tx.shopping_mall_wishlist_items.deleteMany({
      where: { shopping_mall_product_id: props.productId },
    });
  });
  // Note: props.body.reason is available for audit logging
}
