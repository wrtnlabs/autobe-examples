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

export async function deleteShoppingMallSellerSellersMeProductsProductIdVariantsVariantId(props: {
  seller: SellerPayload;
  productId: string;
  variantId: string;
}): Promise<void> {
  // 1. Verify product exists and belongs to seller
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
    select: { id: true, seller_id: true },
  });
  if (product === null) {
    throw new HttpException("Product not found", 404);
  }
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Verify variant exists, belongs to product, and not already deleted
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUnique({
      where: { id: props.variantId },
      select: { id: true, shopping_mall_product_id: true, deleted_at: true },
    });
  if (
    variant === null ||
    variant.shopping_mall_product_id !== props.productId
  ) {
    throw new HttpException("Variant not found", 404);
  }
  if (variant.deleted_at !== null) {
    throw new HttpException("Variant already deleted", 409);
  }
  // 3. Check for pending order items (paid or shipped status)
  const pendingOrderItemsCount =
    await MyGlobal.prisma.shopping_mall_order_items.count({
      where: {
        shopping_mall_product_variant_id: props.variantId,
        status: { in: ["paid", "shipped"] },
      },
    });
  if (pendingOrderItemsCount > 0) {
    throw new HttpException(
      `Cannot delete variant: ${pendingOrderItemsCount} pending order item(s) exist`,
      409,
    );
  }
  // 4. Check for pending cancellation requests via order items
  const pendingCancellationsCount =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.count({
      where: {
        status: "pending",
        orderItem: {
          shopping_mall_product_variant_id: props.variantId,
        },
      },
    });
  if (pendingCancellationsCount > 0) {
    throw new HttpException(
      `Cannot delete variant: ${pendingCancellationsCount} pending cancellation request(s) exist`,
      409,
    );
  }
  // 5. Soft delete the variant by setting deleted_at timestamp
  await MyGlobal.prisma.shopping_mall_product_variants.update({
    where: { id: props.variantId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
}
