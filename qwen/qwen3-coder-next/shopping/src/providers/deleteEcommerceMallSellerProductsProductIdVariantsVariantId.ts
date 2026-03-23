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
  productId: string;
  variantId: string;
}): Promise<void> {
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: { id: true, product_id: true, sku_code: true },
    });
  if (variant.product_id !== props.productId) {
    throw new HttpException("Product ID mismatch", 400);
  }
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { seller_id: true },
    });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const orderItems = await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
    where: {
      variant_id: props.variantId,
      item_status: { in: ["paid", "shipped"] },
    },
    select: { id: true, item_status: true },
  });
  if (orderItems.length > 0) {
    throw new HttpException(
      `Cannot delete variant: ${orderItems.length} order items are in 'paid' or 'shipped' status`,
      409,
    );
  }
  const orderItemIds = orderItems.map((oi) => oi.id);
  const cancellationRequest =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findFirst({
      where: {
        order_item_id: { in: orderItemIds },
        status: "pending",
      },
    });
  if (cancellationRequest) {
    throw new HttpException(
      "Cannot delete variant: pending cancellation request exists",
      409,
    );
  }
  const refundRequest =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findFirst({
      where: {
        order_item_id: { in: orderItemIds },
        status: "pending",
      },
    });
  if (refundRequest) {
    throw new HttpException(
      "Cannot delete variant: pending refund request exists",
      409,
    );
  }
  const remainingVariants =
    await MyGlobal.prisma.ecommerce_mall_product_variants.count({
      where: {
        product_id: props.productId,
        id: { not: props.variantId },
      },
    });
  if (remainingVariants === 0) {
    throw new HttpException(
      "Cannot delete variant: product must retain at least one variant",
      400,
    );
  }
  await MyGlobal.prisma.ecommerce_mall_product_variants.update({
    where: { id: props.variantId },
    data: { deleted_at: new Date() },
  });
  await MyGlobal.prisma.ecommerce_mall_inventory_records.deleteMany({
    where: { variant_id: props.variantId },
  });
}
