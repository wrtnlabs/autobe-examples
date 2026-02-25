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

export async function deleteShoppingMallSellerSellersProductsVariantsVariantId(props: {
  seller: SellerPayload;
  variantId: string;
}): Promise<void> {
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: {
        id: true,
        shopping_mall_product_id: true,
      },
    });
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: variant.shopping_mall_product_id },
      select: {
        shopping_mall_seller_id: true,
      },
    });
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const pendingOrderItems =
    await MyGlobal.prisma.shopping_mall_order_items.findFirst({
      where: {
        shopping_mall_order_variant_snapshot_id: variant.id,
        item_status: { in: ["paid", "shipped"] },
      },
    });
  if (pendingOrderItems !== null) {
    throw new HttpException(
      "Cannot delete variant with pending orders (paid or shipped)",
      400,
    );
  }
  const pendingCancellationRequest =
    await MyGlobal.prisma.shopping_mall_order_cancellation_requests.findFirst({
      where: {
        order_item_id: {
          in: (
            await MyGlobal.prisma.shopping_mall_order_items.findMany({
              where: {
                shopping_mall_order_variant_snapshot_id: variant.id,
              },
              select: { id: true },
            })
          ).map((item) => item.id),
        },
        status: "pending",
      },
    });
  if (pendingCancellationRequest !== null) {
    throw new HttpException(
      "Cannot delete variant with pending cancellation requests",
      400,
    );
  }
  const pendingRefundRequests =
    await MyGlobal.prisma.shopping_mall_order_refund_requests.findFirst({
      where: {
        shopping_mall_order_item_id: {
          in: (
            await MyGlobal.prisma.shopping_mall_order_items.findMany({
              where: {
                shopping_mall_order_variant_snapshot_id: variant.id,
              },
              select: { id: true },
            })
          ).map((item) => item.id),
        },
        status: "pending",
      },
    });
  if (pendingRefundRequests !== null) {
    throw new HttpException(
      "Cannot delete variant with pending refund requests",
      400,
    );
  }
  const remainingVariantsCount =
    await MyGlobal.prisma.shopping_mall_product_variants.count({
      where: {
        shopping_mall_product_id: variant.shopping_mall_product_id,
        id: { not: props.variantId },
      },
    });
  if (remainingVariantsCount === 0) {
    throw new HttpException("Cannot delete the last variant of a product", 400);
  }
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.shopping_mall_inventory_histories.deleteMany({
      where: { shopping_mall_product_variant_id: props.variantId },
    }),
    MyGlobal.prisma.shopping_mall_product_variant_option_values.deleteMany({
      where: { product_variant_id: props.variantId },
    }),
    MyGlobal.prisma.shopping_mall_product_variants.delete({
      where: { id: props.variantId },
    }),
  ]);
}
