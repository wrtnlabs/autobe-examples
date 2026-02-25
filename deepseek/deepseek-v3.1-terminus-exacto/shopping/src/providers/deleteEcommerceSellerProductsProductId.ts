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
  // Verify seller ownership and get product with variants
  const product = await MyGlobal.prisma.ecommerce_products.findUniqueOrThrow({
    where: { id: props.productId },
    select: {
      id: true,
      ecommerce_seller_id: true,
      variants: {
        where: { deleted_at: null },
        select: { id: true },
      } satisfies Prisma.ecommerce_product_variantsFindManyArgs,
    },
  });
  // Check ownership
  if (product.ecommerce_seller_id !== props.seller.id) {
    throw new HttpException("Product not found or access denied", 404);
  }
  const variantIds = product.variants.map((v) => v.id);
  // If product has variants, check for constraints
  if (variantIds.length > 0) {
    // Check for any active constraints in a single optimized query
    const constraints = await MyGlobal.prisma.$transaction([
      MyGlobal.prisma.ecommerce_order_items.findFirst({
        where: {
          product_variant_id: { in: variantIds },
          status: { in: ["paid", "shipped"] },
        },
        select: { id: true },
      }),
      MyGlobal.prisma.ecommerce_cancellation_requests.findFirst({
        where: {
          orderItem: {
            product_variant_id: { in: variantIds },
          },
          deleted_at: null,
        },
        select: { id: true },
      }),
      MyGlobal.prisma.ecommerce_refund_requests.findFirst({
        where: {
          orderItem: {
            product_variant_id: { in: variantIds },
          },
          deleted_at: null,
        },
        select: { id: true },
      }),
    ]);
    const [pendingOrderItem, activeCancellation, activeRefund] = constraints;
    if (pendingOrderItem) {
      throw new HttpException(
        "Cannot delete product with pending order items",
        400,
      );
    }
    if (activeCancellation) {
      throw new HttpException(
        "Cannot delete product with active cancellation requests",
        400,
      );
    }
    if (activeRefund) {
      throw new HttpException(
        "Cannot delete product with active refund requests",
        400,
      );
    }
  }
  // Perform soft deletion with proper date handling
  await MyGlobal.prisma.ecommerce_products.update({
    where: { id: props.productId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
