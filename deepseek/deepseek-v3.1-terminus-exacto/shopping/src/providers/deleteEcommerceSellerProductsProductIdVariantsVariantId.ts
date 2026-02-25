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

export async function deleteEcommerceSellerProductsProductIdVariantsVariantId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify the product exists and belongs to the authenticated seller
  const product = await MyGlobal.prisma.ecommerce_products.findFirst({
    where: {
      id: props.productId,
      ecommerce_seller_id: props.seller.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!product) {
    throw new HttpException(
      "Product not found or you don't have permission to access it",
      404,
    );
  }
  // Verify the variant exists and belongs to the product
  const variant = await MyGlobal.prisma.ecommerce_product_variants.findFirst({
    where: {
      id: props.variantId,
      ecommerce_product_id: props.productId,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!variant) {
    throw new HttpException("Variant not found", 404);
  }
  // Check for pending order items with 'paid' or 'shipped' status
  const pendingOrderItems =
    await MyGlobal.prisma.ecommerce_order_items.findFirst({
      where: {
        product_variant_id: props.variantId,
        status: { in: ["paid", "shipped"] },
      },
      select: { id: true },
    });
  if (pendingOrderItems) {
    throw new HttpException(
      "Cannot delete variant with pending orders in 'paid' or 'shipped' status",
      400,
    );
  }
  // Check for active cancellation or refund requests using a single optimized query
  const orderItemsForVariant =
    await MyGlobal.prisma.ecommerce_order_items.findMany({
      where: { product_variant_id: props.variantId },
      select: { id: true },
    });
  if (orderItemsForVariant.length > 0) {
    const orderItemIds = orderItemsForVariant.map((item) => item.id);
    // Check for active cancellation requests
    const activeCancellationRequests =
      await MyGlobal.prisma.ecommerce_cancellation_requests.findFirst({
        where: {
          ecommerce_order_item_id: { in: orderItemIds },
          deleted_at: null,
        },
        select: { id: true },
      });
    if (activeCancellationRequests) {
      throw new HttpException(
        "Cannot delete variant with active cancellation requests",
        400,
      );
    }
    // Check for active refund requests
    const activeRefundRequests =
      await MyGlobal.prisma.ecommerce_refund_requests.findFirst({
        where: {
          ecommerce_order_item_id: { in: orderItemIds },
          deleted_at: null,
        },
        select: { id: true },
      });
    if (activeRefundRequests) {
      throw new HttpException(
        "Cannot delete variant with active refund requests",
        400,
      );
    }
  }
  // Perform permanent deletion (based on specification: "permanent deletion of the variant record")
  await MyGlobal.prisma.ecommerce_product_variants.delete({
    where: { id: props.variantId },
  });
}
