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

export async function deleteShoppingMallSellerProductsProductIdVariantsVariantIdOptionsOptionId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  optionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify product exists and seller owns it
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, shopping_seller_id: true },
    });
  if (product.shopping_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden: You do not own this product", 403);
  }
  // Verify variant exists and belongs to product
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: { id: true, shopping_mall_product_id: true },
    });
  if (variant.shopping_mall_product_id !== props.productId) {
    throw new HttpException("Variant does not belong to this product", 404);
  }
  // Verify option exists and belongs to variant
  const option =
    await MyGlobal.prisma.shopping_mall_product_variant_options.findUniqueOrThrow(
      {
        where: { id: props.optionId },
        select: { id: true, shopping_mall_product_variant_id: true },
      },
    );
  if (option.shopping_mall_product_variant_id !== props.variantId) {
    throw new HttpException("Option does not belong to this variant", 404);
  }
  // Check for pending order items (PAID or SHIPPED status) for this variant
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
      "Cannot delete option: Variant has pending order items",
      409,
    );
  }
  // Check for pending cancellation requests for order items of this variant
  const pendingCancellationRequests =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findFirst({
      where: {
        orderItem: {
          shopping_mall_product_variant_id: props.variantId,
          deleted_at: null,
        },
        status: "PENDING",
        deleted_at: null,
      },
    });
  if (pendingCancellationRequests) {
    throw new HttpException(
      "Cannot delete option: Variant has pending cancellation requests",
      409,
    );
  }
  // Check for pending refund requests for order items of this variant
  const pendingRefundRequests =
    await MyGlobal.prisma.shopping_mall_refund_requests.findFirst({
      where: {
        orderItem: {
          shopping_mall_product_variant_id: props.variantId,
          deleted_at: null,
        },
        status: "PENDING",
        deleted_at: null,
      },
    });
  if (pendingRefundRequests) {
    throw new HttpException(
      "Cannot delete option: Variant has pending refund requests",
      409,
    );
  }
  // Delete the option record
  await MyGlobal.prisma.shopping_mall_product_variant_options.delete({
    where: { id: props.optionId },
  });
}
