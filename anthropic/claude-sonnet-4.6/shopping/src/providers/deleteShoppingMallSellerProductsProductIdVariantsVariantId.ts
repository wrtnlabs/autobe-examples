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
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Look up the product, 404 if not found or soft-deleted
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      deleted_at: null,
    },
    select: {
      id: true,
      shopping_mall_seller_id: true,
    },
  });
  if (product === null) {
    throw new HttpException("Product not found", 404);
  }
  // Step 2: Verify seller ownership
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Look up the variant scoped to this product, 404 if not found or deleted
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
      where: {
        id: props.variantId,
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (variant === null) {
    throw new HttpException("Variant not found", 404);
  }
  // Step 4: Check for blocking order items (paid or shipped)
  const blockingOrderItemCount =
    await MyGlobal.prisma.shopping_mall_order_items.count({
      where: {
        shopping_mall_product_variant_id: props.variantId,
        status: { in: ["paid", "shipped"] },
      },
    });
  if (blockingOrderItemCount > 0) {
    throw new HttpException(
      "Cannot delete variant: pending orders in paid or shipped status must be resolved first",
      422,
    );
  }
  // Step 5: Check for pending cancellation requests
  const pendingCancellationCount =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.count({
      where: {
        status: "pending",
        orderItem: {
          shopping_mall_product_variant_id: props.variantId,
        },
      },
    });
  if (pendingCancellationCount > 0) {
    throw new HttpException(
      "Cannot delete variant: pending cancellation requests must be resolved first",
      422,
    );
  }
  // Step 6: Check for pending refund requests
  const pendingRefundCount =
    await MyGlobal.prisma.shopping_mall_refund_requests.count({
      where: {
        status: "pending",
        orderItem: {
          shopping_mall_product_variant_id: props.variantId,
        },
      },
    });
  if (pendingRefundCount > 0) {
    throw new HttpException(
      "Cannot delete variant: pending refund requests must be resolved first",
      422,
    );
  }
  // Step 7: Execute soft-delete and cart item update in a transaction
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.shopping_mall_product_variants.update({
      where: { id: props.variantId },
      data: {
        deleted_at: new Date(),
        updated_at: new Date(),
      },
    }),
    MyGlobal.prisma.shopping_mall_cart_items.updateMany({
      where: { product_variant_id: props.variantId },
      data: {
        availability_status: "variant_deleted",
        updated_at: new Date(),
      },
    }),
  ]);
}
