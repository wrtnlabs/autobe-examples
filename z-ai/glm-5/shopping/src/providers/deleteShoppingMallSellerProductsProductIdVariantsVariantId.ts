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
  // Fetch variant with product
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUnique({
      where: { id: props.variantId },
      select: {
        id: true,
        shopping_mall_product_id: true,
        deleted_at: true,
        product: {
          select: {
            id: true,
            shopping_mall_seller_id: true,
            deleted_at: true,
          },
        },
      },
    });
  // Verify variant exists
  if (variant === null) {
    throw new HttpException("Variant not found", 404);
  }
  // Verify variant belongs to product
  if (variant.shopping_mall_product_id !== props.productId) {
    throw new HttpException("Variant does not belong to this product", 400);
  }
  // Verify variant is not already deleted
  if (variant.deleted_at !== null) {
    throw new HttpException("Variant not found", 404);
  }
  // Verify product is not deleted
  if (variant.product.deleted_at !== null) {
    throw new HttpException("Product not found", 404);
  }
  // Check authorization: seller owns product
  if (variant.product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Check constraint: no pending order items (paid/shipped status)
  const pendingOrderItems =
    await MyGlobal.prisma.shopping_mall_order_items.count({
      where: {
        shopping_mall_product_variant_id: props.variantId,
        status: { in: ["paid", "shipped"] },
      },
    });
  if (pendingOrderItems > 0) {
    throw new HttpException("Cannot delete variant with pending orders", 400);
  }
  // Check constraint: no pending cancellation requests
  const pendingCancellationRequests =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.count({
      where: {
        orderItem: {
          shopping_mall_product_variant_id: props.variantId,
        },
        status: "pending",
      },
    });
  if (pendingCancellationRequests > 0) {
    throw new HttpException(
      "Cannot delete variant with pending cancellation requests",
      400,
    );
  }
  // Check constraint: no pending refund requests
  const pendingRefundRequests =
    await MyGlobal.prisma.shopping_mall_refund_requests.count({
      where: {
        orderItem: {
          shopping_mall_product_variant_id: props.variantId,
        },
        status: "pending",
      },
    });
  if (pendingRefundRequests > 0) {
    throw new HttpException(
      "Cannot delete variant with pending refund requests",
      400,
    );
  }
  // Generate timestamp for soft delete
  const now = toISOStringSafe(new Date());
  // Soft delete variant
  await MyGlobal.prisma.shopping_mall_product_variants.update({
    where: { id: props.variantId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
  // Delete from all shopping carts
  await MyGlobal.prisma.shopping_mall_cart_items.deleteMany({
    where: {
      shopping_mall_product_variant_id: props.variantId,
    },
  });
}
