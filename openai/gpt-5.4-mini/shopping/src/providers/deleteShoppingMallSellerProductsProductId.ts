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
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        shopping_mall_seller_id: true,
      },
    });
  if (product.shopping_mall_seller_id !== props.seller.id) {
    const administrator =
      await MyGlobal.prisma.shopping_mall_administrators.findUnique({
        where: { id: props.seller.id },
        select: { id: true },
      });
    if (administrator === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  const variants =
    await MyGlobal.prisma.shopping_mall_product_variants.findMany({
      where: { shopping_mall_product_id: props.productId },
      select: {
        id: true,
      },
    });
  const variantIds = variants.map((variant) => variant.id);
  if (variantIds.length > 0) {
    const blockingOrderItem =
      await MyGlobal.prisma.shopping_mall_order_items.findFirst({
        where: {
          shopping_mall_product_variant_id: { in: variantIds },
          status: { in: ["paid", "shipped"] },
        },
        select: { id: true },
      });
    if (blockingOrderItem !== null) {
      throw new HttpException(
        "Product deletion is blocked by pending order items",
        409,
      );
    }
    const blockingCancellationRequest =
      await MyGlobal.prisma.shopping_mall_cancellation_requests.findFirst({
        where: {
          orderItem: {
            shopping_mall_product_variant_id: { in: variantIds },
          },
        },
        select: { id: true },
      });
    if (blockingCancellationRequest !== null) {
      throw new HttpException(
        "Product deletion is blocked by pending cancellation requests",
        409,
      );
    }
    const blockingRefundRequest =
      await MyGlobal.prisma.shopping_mall_refund_requests.findFirst({
        where: {
          orderItem: {
            shopping_mall_product_variant_id: { in: variantIds },
          },
          status: "pending",
        },
        select: { id: true },
      });
    if (blockingRefundRequest !== null) {
      throw new HttpException(
        "Product deletion is blocked by pending refund requests",
        409,
      );
    }
  }
  await MyGlobal.prisma.$transaction(async (prisma) => {
    const lockedProduct = await prisma.shopping_mall_products.findUniqueOrThrow(
      {
        where: { id: props.productId },
        select: {
          id: true,
          shopping_mall_seller_id: true,
        },
      },
    );
    if (lockedProduct.shopping_mall_seller_id !== props.seller.id) {
      const administrator =
        await prisma.shopping_mall_administrators.findUnique({
          where: { id: props.seller.id },
          select: { id: true },
        });
      if (administrator === null) {
        throw new HttpException("Forbidden", 403);
      }
    }
    const lockedVariants = await prisma.shopping_mall_product_variants.findMany(
      {
        where: { shopping_mall_product_id: props.productId },
        select: { id: true },
      },
    );
    const lockedVariantIds = lockedVariants.map((variant) => variant.id);
    if (lockedVariantIds.length > 0) {
      const blockedOrderItem = await prisma.shopping_mall_order_items.findFirst(
        {
          where: {
            shopping_mall_product_variant_id: { in: lockedVariantIds },
            status: { in: ["paid", "shipped"] },
          },
          select: { id: true },
        },
      );
      if (blockedOrderItem !== null) {
        throw new HttpException(
          "Product deletion is blocked by pending order items",
          409,
        );
      }
      const blockedCancellationRequest =
        await prisma.shopping_mall_cancellation_requests.findFirst({
          where: {
            orderItem: {
              shopping_mall_product_variant_id: { in: lockedVariantIds },
            },
          },
          select: { id: true },
        });
      if (blockedCancellationRequest !== null) {
        throw new HttpException(
          "Product deletion is blocked by pending cancellation requests",
          409,
        );
      }
      const blockedRefundRequest =
        await prisma.shopping_mall_refund_requests.findFirst({
          where: {
            orderItem: {
              shopping_mall_product_variant_id: { in: lockedVariantIds },
            },
            status: "pending",
          },
          select: { id: true },
        });
      if (blockedRefundRequest !== null) {
        throw new HttpException(
          "Product deletion is blocked by pending refund requests",
          409,
        );
      }
    }
    await prisma.shopping_mall_products.delete({
      where: { id: props.productId },
    });
  });
}
