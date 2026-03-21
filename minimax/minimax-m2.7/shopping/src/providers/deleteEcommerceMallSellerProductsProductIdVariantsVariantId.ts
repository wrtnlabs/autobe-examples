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
  // 1. Verify seller owns the product
  const product = await MyGlobal.prisma.ecommerce_mall_products.findUnique({
    where: { id: props.productId },
    select: { id: true, ecommerce_mall_seller_id: true, deleted_at: true },
  });
  if (product === null || product.deleted_at !== null) {
    throw new HttpException("Product not found", 404);
  }
  if (product.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Verify variant exists and belongs to product
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUnique({
      where: { id: props.variantId },
      select: { id: true, ecommerce_mall_product_id: true, deleted_at: true },
    });
  if (
    variant === null ||
    variant.ecommerce_mall_product_id !== props.productId ||
    variant.deleted_at !== null
  ) {
    throw new HttpException("Variant not found", 404);
  }
  // 3. Check deletion eligibility - no active order items (paid/shipped)
  const activeOrderItemsCount =
    await MyGlobal.prisma.ecommerce_mall_order_items.count({
      where: {
        ecommerce_mall_product_variant_id: props.variantId,
        status: { in: ["paid", "shipped"] },
      },
    });
  if (activeOrderItemsCount > 0) {
    throw new HttpException(
      "Cannot delete variant with active (paid or shipped) order items",
      409,
    );
  }
  // 3b. Get order item IDs for this variant (for checking pending requests)
  const orderItems = await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
    where: { ecommerce_mall_product_variant_id: props.variantId },
    select: { id: true },
  });
  const orderItemIds = orderItems.map((item) => item.id);
  // 3c. Check pending cancellation requests
  if (orderItemIds.length > 0) {
    const pendingCancellationCount =
      await MyGlobal.prisma.ecommerce_mall_cancellation_requests.count({
        where: {
          ecommerce_mall_order_item_id: { in: orderItemIds },
          status: "pending",
        },
      });
    if (pendingCancellationCount > 0) {
      throw new HttpException(
        "Cannot delete variant with pending cancellation requests",
        409,
      );
    }
    // 3d. Check pending refund requests
    const pendingRefundCount =
      await MyGlobal.prisma.ecommerce_mall_refund_requests.count({
        where: {
          ecommerce_mall_order_item_id: { in: orderItemIds },
          status: "pending",
        },
      });
    if (pendingRefundCount > 0) {
      throw new HttpException(
        "Cannot delete variant with pending refund requests",
        409,
      );
    }
  }
  // 4. Soft delete the variant
  await MyGlobal.prisma.ecommerce_mall_product_variants.update({
    where: { id: props.variantId },
    data: { deleted_at: new Date() },
  });
  // 5. Cascade delete inventory records
  await MyGlobal.prisma.ecommerce_mall_inventory_records.deleteMany({
    where: { ecommerce_mall_product_variant_id: props.variantId },
  });
}
