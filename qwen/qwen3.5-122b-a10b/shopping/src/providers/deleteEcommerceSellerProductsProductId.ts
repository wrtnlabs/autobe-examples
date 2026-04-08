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

export async function deleteEcommerceSellerProductsProductId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Load product and verify it exists and is not deleted
  const product = await MyGlobal.prisma.ecommerce_products.findUnique({
    where: { id: props.productId },
    select: { id: true, seller_id: true, deleted_at: true },
  });
  if (product === null) {
    throw new HttpException("Product not found", 404);
  }
  if (product.deleted_at !== null) {
    throw new HttpException("Product is already deleted", 400);
  }
  // 2. Validate seller ownership
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Check deletion eligibility - get all variants of the product
  const variants = await MyGlobal.prisma.ecommerce_product_variants.findMany({
    where: { product_id: props.productId, deleted_at: null },
    select: { id: true },
  });
  if (variants.length > 0) {
    const variantIds = variants.map((v) => v.id);
    // 3a. Check for order items with paid or shipped status
    const blockingOrderItems =
      await MyGlobal.prisma.ecommerce_order_items.findFirst({
        where: {
          ecommerce_product_variant_id: { in: variantIds },
          status: { in: ["paid", "shipped"] },
          deleted_at: null,
        },
      });
    if (blockingOrderItems !== null) {
      throw new HttpException(
        "Cannot delete product: has order items with paid or shipped status",
        409,
      );
    }
    // 3b. Get order item IDs for this product's variants
    const orderItems = await MyGlobal.prisma.ecommerce_order_items.findMany({
      where: {
        ecommerce_product_variant_id: { in: variantIds },
        deleted_at: null,
      },
      select: { id: true },
    });
    if (orderItems.length > 0) {
      const orderItemIds = orderItems.map((oi) => oi.id);
      // 3c. Check for pending cancellation requests
      const pendingCancellations =
        await MyGlobal.prisma.ecommerce_cancellation_requests.findFirst({
          where: {
            ecommerce_order_item_id: { in: orderItemIds },
            status: "pending",
            deleted_at: null,
          },
        });
      if (pendingCancellations !== null) {
        throw new HttpException(
          "Cannot delete product: has pending cancellation requests",
          409,
        );
      }
      // 3d. Check for pending refund requests
      const pendingRefunds =
        await MyGlobal.prisma.ecommerce_refund_requests.findFirst({
          where: {
            ecommerce_order_item_id: { in: orderItemIds },
            status: "pending",
            deleted_at: null,
          },
        });
      if (pendingRefunds !== null) {
        throw new HttpException(
          "Cannot delete product: has pending refund requests",
          409,
        );
      }
    }
  }
  // 4. Perform cascade soft-delete by deleting the product
  // Variants and inventory records will be cascade deleted automatically
  await MyGlobal.prisma.ecommerce_products.delete({
    where: { id: props.productId },
  });
}
