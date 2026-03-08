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
  // 1. Verify product exists and belongs to seller
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { seller_id: true },
    });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Verify variant exists and belongs to product
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: { ecommerce_mall_product_id: true, deleted_at: true },
    });
  if (variant.ecommerce_mall_product_id !== props.productId) {
    throw new HttpException("Not Found", 404);
  }
  if (variant.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  // 3. Check for order items with 'paid' or 'shipped' status
  const activeOrderItems =
    await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
      where: {
        ecommerce_mall_product_variant_id: props.variantId,
        status: { in: ["paid", "shipped"] },
        deleted_at: null,
      },
      select: { id: true, status: true },
    });
  if (activeOrderItems.length > 0) {
    throw new HttpException(
      `Cannot delete variant with ${activeOrderItems.length} order item(s) in paid or shipped status`,
      409,
    );
  }
  // 4. Get ALL order items for this variant to check for pending requests
  const allOrderItems =
    await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
      where: {
        ecommerce_mall_product_variant_id: props.variantId,
        deleted_at: null,
      },
      select: { id: true },
    });
  const orderItemIds = allOrderItems.map((item) => item.id);
  // 5. Check for pending cancellation requests on variant's order items
  if (orderItemIds.length > 0) {
    const pendingCancellationRequests =
      await MyGlobal.prisma.ecommerce_mall_order_item_cancellation_requests.findMany(
        {
          where: {
            order_item_id: { in: orderItemIds },
            status: "pending",
            deleted_at: null,
          },
          select: { id: true },
        },
      );
    if (pendingCancellationRequests.length > 0) {
      throw new HttpException(
        `Cannot delete variant with ${pendingCancellationRequests.length} pending cancellation request(s)`,
        409,
      );
    }
    // 6. Check for pending refund requests on variant's order items
    const pendingRefundRequests =
      await MyGlobal.prisma.ecommerce_mall_order_item_refund_requests.findMany({
        where: {
          ecommerce_mall_order_item_id: { in: orderItemIds },
          status: "pending",
          deleted_at: null,
        },
        select: { id: true },
      });
    if (pendingRefundRequests.length > 0) {
      throw new HttpException(
        `Cannot delete variant with ${pendingRefundRequests.length} pending refund request(s)`,
        409,
      );
    }
  }
  // 7. Soft delete the variant
  await MyGlobal.prisma.ecommerce_mall_product_variants.update({
    where: { id: props.variantId },
    data: {
      deleted_at: new Date(),
    },
  });
}
