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

export async function deleteEcommerceMallSellerProductsProductIdVariantsVariantId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Verify product ownership by the seller
  const product = await MyGlobal.prisma.ecommerce_mall_products.findFirst({
    where: {
      id: props.productId,
      seller_id: props.seller.id,
      deleted_at: null,
    },
  });
  if (product === null) {
    throw new HttpException("Product not found", 404);
  }
  // Step 2: Verify the variant exists and belongs to the product
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findFirst({
      where: {
        id: props.variantId,
        product_id: props.productId,
        deleted_at: null,
      },
    });
  if (variant === null) {
    throw new HttpException("Variant not found", 404);
  }
  // Step 3: Check for pending order items with paid or shipped status
  const paidOrShippedOrders =
    await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
      where: {
        variant_snapshot_id: variant.id,
        deleted_at: null,
      },
      include: {
        order: {
          select: { status: true },
        },
      },
    });
  const hasActiveOrders = paidOrShippedOrders.some((item) => {
    const order = item.order;
    return order.status === "paid" || order.status === "shipped";
  });
  if (hasActiveOrders) {
    throw new HttpException(
      "Cannot delete variant with pending paid or shipped orders",
      409,
    );
  }
  // Step 4: Check for pending cancellation requests
  const relatedOrderItems =
    await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
      where: {
        variant_snapshot_id: variant.id,
        deleted_at: null,
      },
      select: { id: true },
    });
  const relatedOrderItemIds = relatedOrderItems.map((item) => item.id);
  const pendingCancellations =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findMany({
      where: {
        order_item_id: {
          in: relatedOrderItemIds,
        },
        status: "pending",
        deleted_at: null,
      },
    });
  if (pendingCancellations.length > 0) {
    throw new HttpException(
      "Cannot delete variant with pending cancellation requests",
      409,
    );
  }
  // Step 5: Check for pending refund requests
  const pendingRefunds =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findMany({
      where: {
        ecommerce_mall_order_item_id: {
          in: relatedOrderItemIds,
        },
        status: "pending",
        deleted_at: null,
      },
    });
  if (pendingRefunds.length > 0) {
    throw new HttpException(
      "Cannot delete variant with pending refund requests",
      409,
    );
  }
  // Step 6: Perform transactional deletion
  const deleteTimestamp: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Soft delete the variant
    await tx.ecommerce_mall_product_variants.update({
      where: { id: props.variantId },
      data: { deleted_at: deleteTimestamp },
    });
    // Soft delete associated inventory records
    await tx.ecommerce_mall_inventory_records.updateMany({
      where: {
        ecommerce_mall_product_variant_id: props.variantId,
        deleted_at: null,
      },
      data: { deleted_at: deleteTimestamp },
    });
  });
}
