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
      select: { id: true, seller_id: true, deleted_at: true },
    });
  if (product.deleted_at !== null) {
    throw new HttpException("Product not found", 404);
  }
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Check for pending paid or shipped order items linked to this product
  const pendingOrderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findFirst({
      where: {
        productVariant: { product: { id: props.productId } },
        status: { in: ["paid", "shipped"] },
        deleted_at: null,
      },
      select: { id: true },
    });
  if (pendingOrderItem) {
    throw new HttpException(
      "Cannot delete product with pending paid or shipped orders",
      400,
    );
  }
  // Check for pending cancellation requests for order items linked
  const pendingCancellation =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findFirst({
      where: {
        orderItem: {
          productVariant: { product: { id: props.productId } },
        },
        seller_approval_status: "pending",
        deleted_at: null,
      },
      select: { id: true },
    });
  if (pendingCancellation) {
    throw new HttpException(
      "Cannot delete product with pending cancellation requests",
      400,
    );
  }
  // Check for pending refund requests for order items linked
  const pendingRefund =
    await MyGlobal.prisma.shopping_mall_refund_requests.findFirst({
      where: {
        orderItem: {
          productVariant: { product: { id: props.productId } },
        },
        status: "pending",
        deleted_at: null,
      },
      select: { id: true },
    });
  if (pendingRefund) {
    throw new HttpException(
      "Cannot delete product with pending refund requests",
      400,
    );
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_products.delete({
      where: { id: props.productId },
    });
  });
}
