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
  // Step 1: Verify product exists and belongs to seller
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
  // Step 2: Verify variant exists and belongs to product
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
  // Step 3: Check for blocking order items with paid or shipped status
  const blockingOrderItems =
    await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
      where: {
        variant_snapshot_id: variant.id,
      },
    });
  const hasBlockingOrders = await Promise.all(
    blockingOrderItems.map(async (item) => {
      const order = await MyGlobal.prisma.ecommerce_mall_orders.findFirst({
        where: {
          id: item.ecommerce_mall_order_id,
          status: { in: ["paid", "shipped"] },
          deleted_at: null,
        },
      });
      return order !== null;
    }),
  );
  const hasPaidOrShippedOrders = hasBlockingOrders.some((hasOrder) => hasOrder);
  if (hasPaidOrShippedOrders) {
    throw new HttpException(
      "Cannot delete variant with pending order items in paid or shipped status",
      409,
    );
  }
  // Step 4: Check for blocking cancellation requests
  const pendingCancellationRequests =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findMany({
      where: {
        order_item_id: {
          in: blockingOrderItems.map((item) => item.id),
        },
        status: "pending",
        deleted_at: null,
      },
    });
  if (pendingCancellationRequests.length > 0) {
    throw new HttpException(
      "Cannot delete variant with pending cancellation requests",
      409,
    );
  }
  // Step 5: Check for blocking refund requests
  const pendingRefundRequests =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findMany({
      where: {
        ecommerce_mall_order_item_id: {
          in: blockingOrderItems.map((item) => item.id),
        },
        status: "pending",
        deleted_at: null,
      },
    });
  if (pendingRefundRequests.length > 0) {
    throw new HttpException(
      "Cannot delete variant with pending refund requests",
      409,
    );
  }
  // Step 6: Execute soft delete in transaction
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.ecommerce_mall_product_variants.update({
      where: { id: props.variantId },
      data: {
        deleted_at: new Date(),
      },
    }),
    MyGlobal.prisma.ecommerce_mall_inventory_records.updateMany({
      where: {
        ecommerce_mall_product_variant_id: props.variantId,
        deleted_at: null,
      },
      data: {
        deleted_at: new Date(),
      },
    }),
  ]);
}
