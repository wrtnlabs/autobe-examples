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
  // Step 1: Verify product exists and is not already deleted
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { seller_id: true, deleted_at: true },
    });
  // Step 2: Verify ownership (seller can only delete their own products)
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Check for order items with paid or shipped status
  const hasActiveOrderItems =
    await MyGlobal.prisma.ecommerce_mall_order_items.findFirst({
      where: {
        productVariant: {
          ecommerce_mall_product_id: props.productId,
        },
        status: {
          in: ["paid", "shipped"],
        },
        deleted_at: null,
      },
    });
  if (hasActiveOrderItems !== null) {
    throw new HttpException("Cannot delete product with active orders", 409);
  }
  // Step 4: Check for pending cancellation requests
  const hasCancellationRequests =
    await MyGlobal.prisma.ecommerce_mall_order_item_cancellation_requests.findFirst(
      {
        where: {
          orderItem: {
            productVariant: {
              ecommerce_mall_product_id: props.productId,
            },
          },
          deleted_at: null,
        },
      },
    );
  if (hasCancellationRequests !== null) {
    throw new HttpException(
      "Cannot delete product with pending cancellation requests",
      409,
    );
  }
  // Step 5: Check for pending refund requests
  const hasRefundRequests =
    await MyGlobal.prisma.ecommerce_mall_order_item_refund_requests.findFirst({
      where: {
        orderItem: {
          productVariant: {
            ecommerce_mall_product_id: props.productId,
          },
        },
        deleted_at: null,
      },
    });
  if (hasRefundRequests !== null) {
    throw new HttpException(
      "Cannot delete product with pending refund requests",
      409,
    );
  }
  // Step 6: Delete product (cascade handles variants, inventory records)
  await MyGlobal.prisma.ecommerce_mall_products.update({
    where: { id: props.productId },
    data: {
      deleted_at: new Date().toISOString() as string & tags.Format<"date-time">,
      status: "deleted",
    },
  });
  // Step 7: Soft delete wishlist entries for this product
  await MyGlobal.prisma.ecommerce_mall_wishlists.updateMany({
    where: { ecommerce_mall_product_id: props.productId, deleted_at: null },
    data: {
      active: false,
      deleted_at: new Date().toISOString() as string & tags.Format<"date-time">,
    },
  });
}
