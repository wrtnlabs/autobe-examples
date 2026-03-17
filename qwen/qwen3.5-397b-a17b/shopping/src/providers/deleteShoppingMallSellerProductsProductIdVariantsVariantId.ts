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

export async function deleteShoppingMallSellerProductsProductIdVariantsVariantId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Verify seller owns the product
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
    select: { id: true, shopping_seller_id: true },
  });
  if (!product || product.shopping_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Verify variant exists and belongs to the product
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUnique({
      where: { id: props.variantId },
      select: { id: true, shopping_mall_product_id: true, deleted: true },
    });
  if (!variant || variant.shopping_mall_product_id !== props.productId) {
    throw new HttpException("Not Found", 404);
  }
  if (variant.deleted) {
    throw new HttpException("Conflict", 409);
  }
  // 3. Check for pending order items (PAID or SHIPPED status)
  const pendingOrderItems =
    await MyGlobal.prisma.shopping_mall_order_items.findFirst({
      where: {
        shopping_mall_product_variant_id: props.variantId,
        status: { in: ["PAID", "SHIPPED"] },
        deleted_at: null,
      },
    });
  if (pendingOrderItems) {
    throw new HttpException(
      "Conflict: Pending order items exist for this variant",
      409,
    );
  }
  // 4. Check for pending cancellation requests
  const pendingCancellationRequests =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findFirst({
      where: {
        status: "PENDING",
        orderItem: {
          shopping_mall_product_variant_id: props.variantId,
          deleted_at: null,
        },
        deleted_at: null,
      },
    });
  if (pendingCancellationRequests) {
    throw new HttpException(
      "Conflict: Pending cancellation requests exist for this variant",
      409,
    );
  }
  // 5. Check for pending refund requests
  const pendingRefundRequests =
    await MyGlobal.prisma.shopping_mall_refund_requests.findFirst({
      where: {
        status: "PENDING",
        orderItem: {
          shopping_mall_product_variant_id: props.variantId,
          deleted_at: null,
        },
        deleted_at: null,
      },
    });
  if (pendingRefundRequests) {
    throw new HttpException(
      "Conflict: Pending refund requests exist for this variant",
      409,
    );
  }
  // 6. Soft delete the variant
  await MyGlobal.prisma.shopping_mall_product_variants.update({
    where: { id: props.variantId },
    data: {
      deleted: true,
      deleted_at: new Date(),
    },
  });
}
