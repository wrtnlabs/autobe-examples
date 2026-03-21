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

export async function deleteEcommerceMallSellerProductsProductId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Verify product exists and belongs to the seller
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, ecommerce_mall_seller_id: true },
    });
  if (product.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Get all variant IDs for this product
  const variants =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findMany({
      where: { ecommerce_mall_product_id: props.productId },
      select: { id: true },
    });
  const variantIds = variants.map((v) => v.id);
  // 3. Check for active orders (paid or shipped status)
  if (variantIds.length > 0) {
    const activeOrderItems =
      await MyGlobal.prisma.ecommerce_mall_order_items.findFirst({
        where: {
          ecommerce_mall_product_variant_id: { in: variantIds },
          status: { in: ["paid", "shipped"] },
        },
      });
    if (activeOrderItems) {
      throw new HttpException("Cannot delete product with active orders", 400);
    }
  }
  // 4. Check for pending cancellation requests via order items
  if (variantIds.length > 0) {
    const orderItemIds = (
      await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
        where: { ecommerce_mall_product_variant_id: { in: variantIds } },
        select: { id: true },
      })
    ).map((item) => item.id);
    const pendingCancellations =
      await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findFirst({
        where: {
          ecommerce_mall_order_item_id: { in: orderItemIds },
          status: "pending",
        },
      });
    if (pendingCancellations) {
      throw new HttpException(
        "Cannot delete product with pending cancellation requests",
        400,
      );
    }
  }
  // 5. Check for pending refund requests via order items
  if (variantIds.length > 0) {
    const orderItemIds = (
      await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
        where: { ecommerce_mall_product_variant_id: { in: variantIds } },
        select: { id: true },
      })
    ).map((item) => item.id);
    const pendingRefunds =
      await MyGlobal.prisma.ecommerce_mall_refund_requests.findFirst({
        where: {
          ecommerce_mall_order_item_id: { in: orderItemIds },
          status: "pending",
        },
      });
    if (pendingRefunds) {
      throw new HttpException(
        "Cannot delete product with pending refund requests",
        400,
      );
    }
  }
  // 6. Execute deletion within transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    const now = new Date();
    // Soft delete product
    await tx.ecommerce_mall_products.update({
      where: { id: props.productId },
      data: { deleted_at: now },
    });
    // Soft delete all product variants
    if (variantIds.length > 0) {
      await tx.ecommerce_mall_product_variants.updateMany({
        where: { ecommerce_mall_product_id: props.productId },
        data: { deleted_at: now },
      });
    }
    // Delete wishlist items for this product
    await tx.ecommerce_mall_wishlist_items.deleteMany({
      where: { ecommerce_mall_product_id: props.productId },
    });
    // Delete cart items for variants of this product
    if (variantIds.length > 0) {
      await tx.ecommerce_mall_cart_items.deleteMany({
        where: { ecommerce_mall_product_variant_id: { in: variantIds } },
      });
    }
  });
}
