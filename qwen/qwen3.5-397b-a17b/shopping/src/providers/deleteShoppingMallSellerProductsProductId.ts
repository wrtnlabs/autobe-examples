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
      select: { id: true, shopping_mall_seller_id: true },
    });
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const variants =
    await MyGlobal.prisma.shopping_mall_product_variants.findMany({
      where: {
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
      select: { id: true },
    });
  const variantIds = variants.map((v) => v.id);
  if (variantIds.length > 0) {
    const pendingOrderItems =
      await MyGlobal.prisma.shopping_mall_order_items.findFirst({
        where: {
          shopping_mall_product_variant_id: { in: variantIds },
          status: { in: ["paid", "shipped"] },
        },
      });
    if (pendingOrderItems) {
      throw new HttpException(
        "Cannot delete product with pending order items in paid or shipped status",
        400,
      );
    }
    const pendingCancellations =
      await MyGlobal.prisma.shopping_mall_cancellation_requests.findFirst({
        where: {
          orderItem: {
            shopping_mall_product_variant_id: { in: variantIds },
          },
          status: "pending",
          deleted_at: null,
        },
      });
    if (pendingCancellations) {
      throw new HttpException(
        "Cannot delete product with pending cancellation requests",
        400,
      );
    }
    const pendingRefunds =
      await MyGlobal.prisma.shopping_mall_refund_requests.findFirst({
        where: {
          orderItem: {
            shopping_mall_product_variant_id: { in: variantIds },
          },
          status: "pending",
          deleted_at: null,
        },
      });
    if (pendingRefunds) {
      throw new HttpException(
        "Cannot delete product with pending refund requests",
        400,
      );
    }
  }
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.shopping_mall_wishlist_items.updateMany({
    where: {
      shopping_mall_product_id: props.productId,
      deleted_at: null,
    },
    data: {
      deleted_at: now,
    },
  });
  await MyGlobal.prisma.shopping_mall_product_variants.updateMany({
    where: {
      shopping_mall_product_id: props.productId,
      deleted_at: null,
    },
    data: {
      deleted_at: now,
    },
  });
  await MyGlobal.prisma.shopping_mall_products.update({
    where: { id: props.productId },
    data: {
      deleted_at: now,
    },
  });
}
