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
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
    select: { id: true, shopping_mall_seller_id: true },
  });
  if (!product || product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Product not found or not owned by seller", 404);
  }
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUnique({
      where: { id: props.variantId },
      select: { id: true, shopping_mall_product_id: true, deleted_at: true },
    });
  if (
    !variant ||
    variant.shopping_mall_product_id !== props.productId ||
    variant.deleted_at !== null
  ) {
    throw new HttpException("Variant not found or already deleted", 404);
  }
  const pendingOrderItems =
    await MyGlobal.prisma.shopping_mall_order_items.findFirst({
      where: {
        shopping_mall_product_variant_id: props.variantId,
        status: { in: ["paid", "shipped"] },
      },
    });
  if (pendingOrderItems) {
    throw new HttpException(
      "Cannot delete variant with pending order items in paid or shipped status",
      400,
    );
  }
  const orderItems = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: {
      shopping_mall_product_variant_id: props.variantId,
    },
    select: { id: true },
  });
  const orderItemIds = orderItems.map((item) => item.id);
  if (orderItemIds.length > 0) {
    const pendingCancellation =
      await MyGlobal.prisma.shopping_mall_cancellation_requests.findFirst({
        where: {
          shopping_mall_order_item_id: { in: orderItemIds },
          status: "pending",
          deleted_at: null,
        },
      });
    if (pendingCancellation) {
      throw new HttpException(
        "Cannot delete variant with pending cancellation requests",
        400,
      );
    }
    const pendingRefund =
      await MyGlobal.prisma.shopping_mall_refund_requests.findFirst({
        where: {
          shopping_mall_order_item_id: { in: orderItemIds },
          status: "pending",
          deleted_at: null,
        },
      });
    if (pendingRefund) {
      throw new HttpException(
        "Cannot delete variant with pending refund requests",
        400,
      );
    }
  }
  await MyGlobal.prisma.shopping_mall_product_variants.update({
    where: { id: props.variantId },
    data: {
      deleted_at: new Date(),
    },
  });
}
