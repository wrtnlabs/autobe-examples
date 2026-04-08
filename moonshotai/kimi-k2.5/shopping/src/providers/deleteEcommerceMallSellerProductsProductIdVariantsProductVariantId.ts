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

export async function deleteEcommerceMallSellerProductsProductIdVariantsProductVariantId(props: {
  seller: SellerPayload;
  productId: string;
  productVariantId: string;
}): Promise<void> {
  await MyGlobal.prisma.$transaction(async (tx) => {
    // 1. Verify product exists and belongs to seller
    const product = await tx.ecommerce_mall_products.findUnique({
      where: { id: props.productId },
      select: { id: true, seller_id: true, deleted_at: true },
    });
    if (product === null || product.deleted_at !== null) {
      throw new HttpException("Product not found", 404);
    }
    if (product.seller_id !== props.seller.id) {
      throw new HttpException("Forbidden", 403);
    }
    // 2. Verify variant exists and belongs to the product
    const variant = await tx.ecommerce_mall_product_variants.findUnique({
      where: { id: props.productVariantId },
      select: { id: true, product_id: true, deleted_at: true },
    });
    if (variant === null || variant.deleted_at !== null) {
      throw new HttpException("Product variant not found", 404);
    }
    if (variant.product_id !== props.productId) {
      throw new HttpException(
        "Product variant does not belong to this product",
        404,
      );
    }
    // 3. Check for pending order items (paid or shipped status)
    const pendingOrderItems = await tx.ecommerce_mall_order_items.count({
      where: {
        variant_id: props.productVariantId,
        status: { in: ["paid", "shipped"] },
      },
    });
    if (pendingOrderItems > 0) {
      throw new HttpException("VARIANT_HAS_PENDING_ORDERS", 409);
    }
    // 4. Check for pending cancellation requests
    const pendingCancellations =
      await tx.ecommerce_mall_cancellation_requests.count({
        where: {
          orderItem: {
            variant_id: props.productVariantId,
          },
          status: "pending",
        },
      });
    if (pendingCancellations > 0) {
      throw new HttpException("VARIANT_HAS_PENDING_CANCELLATIONS", 409);
    }
    // 5. Check for pending refund requests
    const pendingRefunds = await tx.ecommerce_mall_refund_requests.count({
      where: {
        orderItem: {
          variant_id: props.productVariantId,
        },
        status: "pending",
      },
    });
    if (pendingRefunds > 0) {
      throw new HttpException("VARIANT_HAS_PENDING_REFUNDS", 409);
    }
    // 6. Soft delete the variant
    const now = new Date();
    await tx.ecommerce_mall_product_variants.update({
      where: { id: props.productVariantId },
      data: { deleted_at: now, updated_at: now },
    });
    // 7. Check if this was the last active variant
    const remainingVariants = await tx.ecommerce_mall_product_variants.count({
      where: {
        product_id: props.productId,
        deleted_at: null,
      },
    });
    // If no remaining variants, product becomes unavailable
    if (remainingVariants === 0) {
      await tx.ecommerce_mall_products.update({
        where: { id: props.productId },
        data: { updated_at: now },
      });
    }
  });
}
