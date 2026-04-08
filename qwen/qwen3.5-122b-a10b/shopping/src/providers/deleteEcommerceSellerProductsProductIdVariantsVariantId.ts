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
  // 1. Verify product exists and seller owns it
  const product = await MyGlobal.prisma.ecommerce_products.findUnique({
    where: { id: props.productId },
    select: { id: true, seller_id: true },
  });
  if (product === null) {
    throw new HttpException("Product not found", 404);
  }
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Verify variant exists and belongs to the product
  const variant = await MyGlobal.prisma.ecommerce_product_variants.findUnique({
    where: { id: props.variantId },
    select: { id: true, product_id: true, deleted_at: true },
  });
  if (variant === null || variant.product_id !== props.productId) {
    throw new HttpException("Variant not found", 404);
  }
  // 3. Check for order items with paid or shipped status
  const hasPaidOrShippedOrders =
    await MyGlobal.prisma.ecommerce_order_items.findFirst({
      where: {
        ecommerce_product_variant_id: props.variantId,
        status: {
          in: ["paid", "shipped"],
        },
        deleted_at: null,
      },
    });
  if (hasPaidOrShippedOrders !== null) {
    throw new HttpException("Deletion blocked", 409);
  }
  // 4. Check for pending cancellation requests
  const cancellationWhere = {
    orderItem: {
      ecommerce_product_variant_id: props.variantId,
    },
    status: "pending",
    deleted_at: null,
  } satisfies Prisma.ecommerce_cancellation_requestsWhereInput;
  const hasPendingCancellations =
    await MyGlobal.prisma.ecommerce_cancellation_requests.findFirst({
      where: cancellationWhere,
    });
  if (hasPendingCancellations !== null) {
    throw new HttpException("Deletion blocked", 409);
  }
  // 5. Check for pending refund requests
  const refundWhere = {
    orderItem: {
      ecommerce_product_variant_id: props.variantId,
    },
    status: "pending",
    deleted_at: null,
  } satisfies Prisma.ecommerce_refund_requestsWhereInput;
  const hasPendingRefunds =
    await MyGlobal.prisma.ecommerce_refund_requests.findFirst({
      where: refundWhere,
    });
  if (hasPendingRefunds !== null) {
    throw new HttpException("Deletion blocked", 409);
  }
  // 6. Check if this is the last active variant
  const activeVariantCount =
    await MyGlobal.prisma.ecommerce_product_variants.count({
      where: {
        product_id: props.productId,
        deleted_at: null,
      },
    });
  if (activeVariantCount <= 1) {
    throw new HttpException("Deletion blocked", 409);
  }
  // 7. Soft delete the variant
  await MyGlobal.prisma.ecommerce_product_variants.update({
    where: { id: props.variantId },
    data: {
      deleted_at: new Date(),
    },
  });
}
