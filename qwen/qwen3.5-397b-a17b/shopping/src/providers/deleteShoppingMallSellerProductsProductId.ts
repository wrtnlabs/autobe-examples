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
  // Verify product exists and belongs to the seller
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
    select: { id: true, shopping_seller_id: true },
  });
  if (product === null) {
    throw new HttpException("Not Found", 404);
  }
  if (product.shopping_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Get all variant IDs for this product
  const variants =
    await MyGlobal.prisma.shopping_mall_product_variants.findMany({
      where: {
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
      select: { id: true },
    });
  const variantIds = variants.map((v) => v.id);
  // Check for pending order items with PAID or SHIPPED status
  if (variantIds.length > 0) {
    const pendingOrderItems =
      await MyGlobal.prisma.shopping_mall_order_items.findFirst({
        where: {
          shopping_mall_product_variant_id: { in: variantIds },
          status: { in: ["PAID", "SHIPPED"] },
          deleted_at: null,
        },
        select: { id: true },
      });
    if (pendingOrderItems !== null) {
      throw new HttpException(
        "Cannot delete product with pending order items in PAID or SHIPPED status",
        400,
      );
    }
    // Check for pending cancellation requests
    const pendingCancellationRequests =
      await MyGlobal.prisma.shopping_mall_cancellation_requests.findFirst({
        where: {
          orderItem: {
            shopping_mall_product_variant_id: { in: variantIds },
          },
          status: "PENDING",
          deleted_at: null,
        },
        select: { id: true },
      });
    if (pendingCancellationRequests !== null) {
      throw new HttpException(
        "Cannot delete product with pending cancellation requests",
        400,
      );
    }
    // Check for pending refund requests
    const pendingRefundRequests =
      await MyGlobal.prisma.shopping_mall_refund_requests.findFirst({
        where: {
          orderItem: {
            shopping_mall_product_variant_id: { in: variantIds },
          },
          status: "PENDING",
          deleted_at: null,
        },
        select: { id: true },
      });
    if (pendingRefundRequests !== null) {
      throw new HttpException(
        "Cannot delete product with pending refund requests",
        400,
      );
    }
  }
  // Execute soft delete in transaction
  const now = new Date().toISOString() as string & tags.Format<"date-time">;
  await MyGlobal.prisma.$transaction([
    // Soft delete all variants
    MyGlobal.prisma.shopping_mall_product_variants.updateMany({
      where: {
        shopping_mall_product_id: props.productId,
      },
      data: {
        deleted: true,
        deleted_at: now,
      },
    }),
    // Soft delete the product
    MyGlobal.prisma.shopping_mall_products.update({
      where: { id: props.productId },
      data: {
        deleted: true,
        deleted_at: now,
      },
    }),
  ]);
}
