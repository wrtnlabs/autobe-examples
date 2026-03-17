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

export async function deleteShoppingMallSellerProductsProductIdVariantsVariantId(props: {
  seller: SellerPayload;
  productId: string;
  variantId: string;
}): Promise<void> {
  // 1. Authorization: Verify product exists and belongs to seller
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, shopping_mall_seller_id: true },
    });
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Verify variant exists and belongs to this product
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: { id: true, shopping_mall_product_id: true, deleted_at: true },
    });
  if (variant.shopping_mall_product_id !== props.productId) {
    throw new HttpException("Variant does not belong to this product", 400);
  }
  if (variant.deleted_at !== null) {
    throw new HttpException("Variant already deleted", 400);
  }
  // 3. Constraint: Check for pending order items (paid or shipped status)
  const pendingOrderItems =
    await MyGlobal.prisma.shopping_mall_order_items.count({
      where: {
        shopping_mall_product_variant_id: props.variantId,
        status: { in: ["paid", "shipped"] },
      },
    });
  if (pendingOrderItems > 0) {
    throw new HttpException(
      "Cannot delete variant while orders are pending",
      400,
    );
  }
  // 4. Constraint: Check for pending cancellation requests
  const pendingCancellations =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.count({
      where: {
        status: "pending",
        orderItem: {
          shopping_mall_product_variant_id: props.variantId,
        },
      },
    });
  if (pendingCancellations > 0) {
    throw new HttpException(
      "Cannot delete variant while cancellation requests are pending",
      400,
    );
  }
  // 5. Constraint: Check for pending refund requests
  const pendingRefunds =
    await MyGlobal.prisma.shopping_mall_refund_requests.count({
      where: {
        status: "pending",
        orderItem: {
          shopping_mall_product_variant_id: props.variantId,
        },
      },
    });
  if (pendingRefunds > 0) {
    throw new HttpException(
      "Cannot delete variant while refund requests are pending",
      400,
    );
  }
  // 6. Perform deletion in transaction
  await MyGlobal.prisma.$transaction([
    // Soft delete the variant
    MyGlobal.prisma.shopping_mall_product_variants.update({
      where: { id: props.variantId },
      data: {
        deleted_at: new Date(),
      },
    }),
    // Delete all cart items referencing this variant
    MyGlobal.prisma.shopping_mall_cart_items.deleteMany({
      where: {
        shopping_mall_product_variant_id: props.variantId,
      },
    }),
  ]);
}
