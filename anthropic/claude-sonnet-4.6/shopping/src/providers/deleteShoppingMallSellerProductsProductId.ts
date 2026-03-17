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

export async function deleteShoppingMallSellerProductsProductId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Look up the product — must exist and not be already deleted
  const product = await MyGlobal.prisma.shopping_mall_products.findFirstOrThrow(
    {
      where: {
        id: props.productId,
        deleted_at: null,
      },
      select: {
        id: true,
        shopping_mall_seller_id: true,
      },
    },
  );
  // Step 2: Authorization — seller must own the product
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden: you do not own this product", 403);
  }
  // Step 3: Gather all variant IDs for this product
  const variants =
    await MyGlobal.prisma.shopping_mall_product_variants.findMany({
      where: {
        shopping_mall_product_id: props.productId,
      },
      select: {
        id: true,
      },
    });
  const variantIds = variants.map((v) => v.id);
  if (variantIds.length > 0) {
    // Step 4: Safety check — any order items in 'paid' or 'shipped' status?
    const blockedByOrders =
      await MyGlobal.prisma.shopping_mall_order_items.findFirst({
        where: {
          shopping_mall_product_variant_id: { in: variantIds },
          status: { in: ["paid", "shipped"] },
        },
        select: { id: true },
      });
    if (blockedByOrders !== null) {
      throw new HttpException(
        "Cannot delete product: pending orders must be resolved first",
        422,
      );
    }
    // Step 5a: Safety check — any pending cancellation requests?
    const orderItems = await MyGlobal.prisma.shopping_mall_order_items.findMany(
      {
        where: {
          shopping_mall_product_variant_id: { in: variantIds },
        },
        select: { id: true },
      },
    );
    const orderItemIds = orderItems.map((oi) => oi.id);
    if (orderItemIds.length > 0) {
      const blockedByCancellations =
        await MyGlobal.prisma.shopping_mall_cancellation_requests.findFirst({
          where: {
            shopping_mall_order_item_id: { in: orderItemIds },
            status: "pending",
          },
          select: { id: true },
        });
      if (blockedByCancellations !== null) {
        throw new HttpException(
          "Cannot delete product: pending cancellation requests must be resolved first",
          422,
        );
      }
      // Step 5b: Safety check — any pending refund requests?
      const blockedByRefunds =
        await MyGlobal.prisma.shopping_mall_refund_requests.findFirst({
          where: {
            order_item_id: { in: orderItemIds },
            status: "pending",
          },
          select: { id: true },
        });
      if (blockedByRefunds !== null) {
        throw new HttpException(
          "Cannot delete product: pending refund requests must be resolved first",
          422,
        );
      }
    }
  }
  // Step 6: Execute deletion in a transaction
  await MyGlobal.prisma.$transaction([
    // 6a: Soft-delete the product
    MyGlobal.prisma.shopping_mall_products.update({
      where: { id: props.productId },
      data: {
        deleted_at: new Date(),
        updated_at: new Date(),
      },
    }),
    // 6b: Soft-delete all active variants
    MyGlobal.prisma.shopping_mall_product_variants.updateMany({
      where: {
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
      data: {
        deleted_at: new Date(),
        updated_at: new Date(),
      },
    }),
    // 6c: Hard-delete all wishlist items
    MyGlobal.prisma.shopping_mall_wishlist_items.deleteMany({
      where: {
        shopping_mall_product_id: props.productId,
      },
    }),
  ]);
}
