import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteEcommerceMallAdminProductsProductId(props: {
  admin: AdminPayload;
  productId: string;
}): Promise<void> {
  // Verify product exists
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true },
    });
  // Check blocking conditions
  const blockingOrderItems =
    await MyGlobal.prisma.ecommerce_mall_order_items.count({
      where: {
        product_id: props.productId,
        status: { in: ["paid", "shipped"] },
        deleted_at: null,
      },
    });
  if (blockingOrderItems > 0) {
    throw new HttpException(
      `Cannot delete product with ${blockingOrderItems} paid or shipped order items`,
      409,
    );
  }
  // Check pending cancellation requests via order items
  const pendingCancellations =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.count({
      where: {
        orderItem: {
          product_id: props.productId,
          deleted_at: null,
        },
        status: "pending",
        deleted_at: null,
      },
    });
  if (pendingCancellations > 0) {
    throw new HttpException(
      `Cannot delete product with ${pendingCancellations} pending cancellation requests`,
      409,
    );
  }
  // Check pending refund requests via order items
  const pendingRefunds =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.count({
      where: {
        orderItem: {
          product_id: props.productId,
          deleted_at: null,
        },
        status: "pending",
        deleted_at: null,
      },
    });
  if (pendingRefunds > 0) {
    throw new HttpException(
      `Cannot delete product with ${pendingRefunds} pending refund requests`,
      409,
    );
  }
  // Get variant IDs for inventory cleanup
  const variants =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findMany({
      where: {
        product_id: props.productId,
        deleted_at: null,
      },
      select: { id: true },
    });
  const variantIds = variants.map((v) => v.id);
  // Perform cascade soft-deletion in transaction
  const now = new Date();
  await MyGlobal.prisma.$transaction([
    // Soft delete product
    MyGlobal.prisma.ecommerce_mall_products.update({
      where: { id: props.productId },
      data: { deleted_at: now, updated_at: now },
    }),
    // Soft delete all variants
    MyGlobal.prisma.ecommerce_mall_product_variants.updateMany({
      where: { product_id: props.productId, deleted_at: null },
      data: { deleted_at: now, updated_at: now },
    }),
    // Delete inventory records for variants
    ...(variantIds.length > 0
      ? [
          MyGlobal.prisma.ecommerce_mall_inventory_records.deleteMany({
            where: { product_variant_id: { in: variantIds } },
          }),
        ]
      : []),
    // Delete product images
    MyGlobal.prisma.ecommerce_mall_product_images.deleteMany({
      where: { product_id: props.productId },
    }),
  ]);
}
