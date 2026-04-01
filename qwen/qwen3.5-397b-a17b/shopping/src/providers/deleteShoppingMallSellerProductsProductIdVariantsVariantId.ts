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
  // 1. Verify product exists and belongs to the seller
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, seller_id: true, deleted_at: true },
    });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (product.deleted_at !== null) {
    throw new HttpException("Product is deleted", 400);
  }
  // 2. Verify variant exists and belongs to the product
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: { id: true, shopping_mall_product_id: true, deleted_at: true },
    });
  if (variant.shopping_mall_product_id !== props.productId) {
    throw new HttpException("Variant does not belong to the product", 400);
  }
  if (variant.deleted_at !== null) {
    throw new HttpException("Variant is already deleted", 400);
  }
  // 3. Check for pending order items in 'paid' or 'shipped' status
  const pendingOrderItems =
    await MyGlobal.prisma.shopping_mall_order_items.findFirst({
      where: {
        shopping_mall_product_variant_id: props.variantId,
        status: { in: ["paid", "shipped"] },
        deleted_at: null,
      },
    });
  if (pendingOrderItems) {
    throw new HttpException(
      "Cannot delete variant with pending order items",
      400,
    );
  }
  // 4. Check for pending cancellation requests via orderItem relation
  const pendingCancellationRequests =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findFirst({
      where: {
        orderItem: {
          shopping_mall_product_variant_id: props.variantId,
        },
        status: "pending",
        deleted_at: null,
      },
    });
  if (pendingCancellationRequests) {
    throw new HttpException(
      "Cannot delete variant with pending cancellation requests",
      400,
    );
  }
  // 5. Check for pending refund requests via orderItem relation
  const pendingRefundRequests =
    await MyGlobal.prisma.shopping_mall_refund_requests.findFirst({
      where: {
        orderItem: {
          shopping_mall_product_variant_id: props.variantId,
        },
        status: "pending",
        deleted_at: null,
      },
    });
  if (pendingRefundRequests) {
    throw new HttpException(
      "Cannot delete variant with pending refund requests",
      400,
    );
  }
  // 6. Check product has at least one other variant remaining
  const variantCount =
    await MyGlobal.prisma.shopping_mall_product_variants.count({
      where: {
        shopping_mall_product_id: props.productId,
        id: { not: props.variantId },
        deleted_at: null,
      },
    });
  if (variantCount === 0) {
    throw new HttpException("Cannot delete the last variant of a product", 400);
  }
  // 7. Delete inventory records for this variant (cascade on hard delete, but we soft delete variant)
  await MyGlobal.prisma.shopping_mall_inventory_records.deleteMany({
    where: {
      product_variant_id: props.variantId,
    },
  });
  // 8. Soft delete the variant
  await MyGlobal.prisma.shopping_mall_product_variants.update({
    where: { id: props.variantId },
    data: {
      deleted_at: new Date(),
    },
  });
}
