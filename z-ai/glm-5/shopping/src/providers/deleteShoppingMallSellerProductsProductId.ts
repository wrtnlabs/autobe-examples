import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
  productId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Verify product exists and seller owns it
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
    select: { id: true, shopping_mall_seller_id: true, deleted_at: true },
  });
  if (product === null || product.deleted_at !== null) {
    throw new HttpException("Product not found", 404);
  }
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Check for pending order items (paid or shipped status)
  const pendingOrderItems =
    await MyGlobal.prisma.shopping_mall_order_items.count({
      where: {
        shopping_mall_product_id: props.productId,
        status: { in: ["paid", "shipped"] },
        deleted_at: null,
      },
    });
  if (pendingOrderItems > 0) {
    throw new HttpException(
      "Cannot delete product with pending order items",
      400,
    );
  }
  // 3. Check for pending cancellation requests
  const pendingCancellations =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.count({
      where: {
        status: "pending",
        orderItem: {
          shopping_mall_product_id: props.productId,
        },
      },
    });
  if (pendingCancellations > 0) {
    throw new HttpException(
      "Cannot delete product with pending cancellation requests",
      400,
    );
  }
  // 4. Check for pending refund requests
  const pendingRefunds =
    await MyGlobal.prisma.shopping_mall_refund_requests.count({
      where: {
        status: "pending",
        orderItem: {
          shopping_mall_product_id: props.productId,
        },
      },
    });
  if (pendingRefunds > 0) {
    throw new HttpException(
      "Cannot delete product with pending refund requests",
      400,
    );
  }
  // 5. Execute cascade deletion in transaction
  const now = new Date();
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Get all variant IDs for inventory record deletion
    const variants = await tx.shopping_mall_product_variants.findMany({
      where: { shopping_mall_product_id: props.productId },
      select: { id: true },
    });
    const variantIds = variants.map((v) => v.id);
    // Hard delete inventory records for all variants
    if (variantIds.length > 0) {
      await tx.shopping_mall_inventory_records.deleteMany({
        where: { variant_id: { in: variantIds } },
      });
    }
    // Hard delete product images
    await tx.shopping_mall_product_images.deleteMany({
      where: { shopping_mall_product_id: props.productId },
    });
    // Delete wishlist items referencing this product
    await tx.shopping_mall_wishlist_items.deleteMany({
      where: { shopping_mall_product_id: props.productId },
    });
    // Soft delete all variants
    await tx.shopping_mall_product_variants.updateMany({
      where: { shopping_mall_product_id: props.productId },
      data: { deleted_at: now },
    });
    // Soft delete the product
    await tx.shopping_mall_products.update({
      where: { id: props.productId },
      data: { deleted_at: now },
    });
  });
}
