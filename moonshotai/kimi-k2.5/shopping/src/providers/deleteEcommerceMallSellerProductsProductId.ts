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
  // Verify product ownership
  const product = await MyGlobal.prisma.ecommerce_mall_products.findUnique({
    where: { id: props.productId },
    select: { id: true, seller_id: true, deleted_at: true },
  });
  if (product === null) {
    throw new HttpException("Product not found", 404);
  }
  if (product.deleted_at !== null) {
    throw new HttpException("Product not found", 404);
  }
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Check for blocking order items with paid or shipped status
  const blockingOrderItems =
    await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
      where: {
        product_id: props.productId,
        status: { in: ["paid", "shipped"] },
        deleted_at: null,
      },
      select: { id: true },
    });
  if (blockingOrderItems.length > 0) {
    throw new HttpException(
      `Cannot delete product: ${blockingOrderItems.length} order item(s) with 'paid' or 'shipped' status exist`,
      409,
    );
  }
  // Check for pending cancellation requests
  const blockingCancellations =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.count({
      where: {
        orderItem: {
          product_id: props.productId,
        },
        status: "pending",
        deleted_at: null,
      },
    });
  if (blockingCancellations > 0) {
    throw new HttpException(
      `Cannot delete product: ${blockingCancellations} pending cancellation request(s) exist`,
      409,
    );
  }
  // Check for pending refund requests
  const blockingRefunds =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.count({
      where: {
        orderItem: {
          product_id: props.productId,
        },
        status: "pending",
        deleted_at: null,
      },
    });
  if (blockingRefunds > 0) {
    throw new HttpException(
      `Cannot delete product: ${blockingRefunds} pending refund request(s) exist`,
      409,
    );
  }
  // Get all variant IDs for inventory record cleanup
  const variants =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findMany({
      where: {
        product_id: props.productId,
      },
      select: { id: true },
    });
  const variantIds = variants.map((v) => v.id);
  const now = new Date().toISOString() as string & tags.Format<"date-time">;
  // Perform cascade deletion in transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Delete inventory records for all variants
    if (variantIds.length > 0) {
      await tx.ecommerce_mall_inventory_records.deleteMany({
        where: {
          product_variant_id: { in: variantIds },
        },
      });
    }
    // Soft-delete all product variants
    await tx.ecommerce_mall_product_variants.updateMany({
      where: {
        product_id: props.productId,
      },
      data: {
        deleted_at: now,
        updated_at: now,
      },
    });
    // Delete all product images
    await tx.ecommerce_mall_product_images.deleteMany({
      where: {
        product_id: props.productId,
      },
    });
    // Soft-delete the product
    await tx.ecommerce_mall_products.update({
      where: { id: props.productId },
      data: {
        deleted_at: now,
        updated_at: now,
      },
    });
  });
}
