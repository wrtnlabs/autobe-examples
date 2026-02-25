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
  productId: string;
}): Promise<void> {
  // Fetch product to verify ownership and existence
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: {
      id: props.productId,
      seller_id: props.seller.id,
      deleted_at: null, // Only allow deletion of active products
    },
  });
  if (!product) {
    throw new HttpException("Product not found or already deleted", 404);
  }
  // Find all variants of this product
  const variants =
    await MyGlobal.prisma.shopping_mall_product_variants.findMany({
      where: {
        product_id: props.productId,
      },
    });
  // Get all variant IDs in single step
  const variantIds = variants.map((v) => v.id);
  // Check for order items with status 'paid' or 'shipped' for any variant
  const orderItemsWithData =
    await MyGlobal.prisma.shopping_mall_order_items.findMany({
      where: {
        shopping_mall_product_variant_id: {
          in: variantIds,
        },
        status: {
          in: ["paid", "shipped"],
        },
      },
      select: {
        shopping_mall_product_variant_id: true,
        status: true,
      },
    });
  if (orderItemsWithData.length > 0) {
    const affectedVariantIds = [
      ...new Set(
        orderItemsWithData.map((item) => item.shopping_mall_product_variant_id),
      ),
    ];
    throw new HttpException(
      `Cannot delete product because the following variants have active order items: ${affectedVariantIds.join(", ")}`,
      409,
    );
  }
  // Check for pending cancellation requests for any variant
  const orderItemIds = (
    await MyGlobal.prisma.shopping_mall_order_items.findMany({
      where: {
        shopping_mall_product_variant_id: {
          in: variantIds,
        },
      },
      select: { id: true },
    })
  ).map((item) => item.id);
  const pendingCancellations =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findMany({
      where: {
        order_item_id: {
          in: orderItemIds,
        },
        status: "pending",
      },
      select: { order_item_id: true },
    });
  if (pendingCancellations.length > 0) {
    const affectedVariantIds = [
      ...new Set(
        (
          await MyGlobal.prisma.shopping_mall_order_items.findMany({
            where: {
              id: {
                in: pendingCancellations.map((req) => req.order_item_id),
              },
            },
            select: { shopping_mall_product_variant_id: true },
          })
        ).map((v) => v.shopping_mall_product_variant_id),
      ),
    ];
    throw new HttpException(
      `Cannot delete product because the following variants have pending cancellation requests: ${affectedVariantIds.join(", ")}`,
      409,
    );
  }
  // Check for pending refund requests for any variant
  const pendingRefunds =
    await MyGlobal.prisma.shopping_mall_refund_requests.findMany({
      where: {
        order_item_id: {
          in: orderItemIds,
        },
        status: "pending",
      },
      select: { order_item_id: true },
    });
  if (pendingRefunds.length > 0) {
    const affectedVariantIds = [
      ...new Set(
        (
          await MyGlobal.prisma.shopping_mall_order_items.findMany({
            where: {
              id: {
                in: pendingRefunds.map((req) => req.order_item_id),
              },
            },
            select: { shopping_mall_product_variant_id: true },
          })
        ).map((v) => v.shopping_mall_product_variant_id),
      ),
    ];
    throw new HttpException(
      `Cannot delete product because the following variants have pending refund requests: ${affectedVariantIds.join(", ")}`,
      409,
    );
  }
  // Perform logical delete - update deleted_at timestamp
  await MyGlobal.prisma.shopping_mall_products.update({
    where: { id: props.productId },
    data: {
      deleted_at: new Date().toISOString() as string & tags.Format<"date-time">,
    },
  });
  // Return 204 No Content as specified
}
