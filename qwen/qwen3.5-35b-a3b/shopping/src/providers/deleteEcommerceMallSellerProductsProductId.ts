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
  // 1. Find product and validate it exists and is owned by seller
  const product = await MyGlobal.prisma.ecommerce_mall_products.findFirst({
    where: {
      id: props.productId,
      deleted_at: null,
    },
    select: {
      id: true,
      seller_id: true,
      name: true,
    },
  });
  if (product === null) {
    throw new HttpException("Product not found", 404);
  }
  // Validate ownership
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Get all product variants
  const variants =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findMany({
      where: { product_id: props.productId },
      select: { id: true },
    });
  const variantIds = variants.map((v) => v.id);
  if (variantIds.length === 0) {
    // No variants to check, safe to proceed
  } else {
    // Get order items for these variants through the snapshot relationship
    const orderItems =
      await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
        where: {
          variant_snapshot_id: {
            in: variantIds,
          },
        },
        select: { id: true },
      });
    const orderItemIds = orderItems.map((oi) => oi.id);
    if (orderItemIds.length > 0) {
      // Check for order items with paid or shipped status (through parent orders)
      const orderItemsWithOrders =
        await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
          where: {
            id: {
              in: orderItemIds,
            },
          },
          select: { ecommerce_mall_order_id: true },
        });
      const uniqueOrderIds = Array.from(
        new Set(orderItemsWithOrders.map((oi) => oi.ecommerce_mall_order_id)),
      );
      const hasPaidOrShippedOrders =
        await MyGlobal.prisma.ecommerce_mall_orders.findFirst({
          where: {
            id: {
              in: uniqueOrderIds,
            },
            status: {
              in: ["paid", "shipped"],
            },
          },
          select: { id: true },
        });
      if (hasPaidOrShippedOrders) {
        throw new HttpException(
          "Cannot delete product with paid or shipped order items",
          409,
        );
      }
      // Check for pending cancellation requests
      const hasPendingCancellations =
        await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findFirst({
          where: {
            order_item_id: {
              in: orderItemIds,
            },
            status: {
              notIn: ["completed", "rejected"],
            },
          },
          select: { id: true },
        });
      if (hasPendingCancellations) {
        throw new HttpException(
          "Cannot delete product with pending cancellation requests",
          409,
        );
      }
      // Check for pending refund requests
      const hasPendingRefunds =
        await MyGlobal.prisma.ecommerce_mall_refund_requests.findFirst({
          where: {
            ecommerce_mall_order_item_id: {
              in: orderItemIds,
            },
            status: {
              notIn: ["completed", "rejected"],
            },
          },
          select: { id: true },
        });
      if (hasPendingRefunds) {
        throw new HttpException(
          "Cannot delete product with pending refund requests",
          409,
        );
      }
    }
  }
  // 3. Perform deletion in transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Delete product variants (cascade will handle inventory records automatically)
    await tx.ecommerce_mall_product_variants.deleteMany({
      where: { product_id: props.productId },
    });
    // Soft delete the product
    await tx.ecommerce_mall_products.update({
      where: { id: props.productId },
      data: { deleted_at: new Date() },
    });
  });
}
