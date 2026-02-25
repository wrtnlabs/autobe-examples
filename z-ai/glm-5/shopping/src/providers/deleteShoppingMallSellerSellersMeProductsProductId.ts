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

export async function deleteShoppingMallSellerSellersMeProductsProductId(props: {
  seller: SellerPayload;
  productId: string;
}): Promise<void> {
  // 1. Verify product exists and belongs to seller
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, seller_id: true },
    });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Check for pending orders (paid/shipped status)
  const pendingOrderItems =
    await MyGlobal.prisma.shopping_mall_order_items.findFirst({
      where: {
        shopping_mall_product_id: props.productId,
        status: { in: ["paid", "shipped"] },
      },
    });
  if (pendingOrderItems !== null) {
    throw new HttpException("Cannot delete product with pending orders", 400);
  }
  // 3. Check for pending cancellation requests
  const pendingCancellationRequests =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findFirst({
      where: {
        orderItem: { shopping_mall_product_id: props.productId },
        status: "pending",
      },
    });
  if (pendingCancellationRequests !== null) {
    throw new HttpException(
      "Cannot delete product with pending cancellation requests",
      400,
    );
  }
  // 4. Soft delete product
  // Cascade deletion handles: variants, inventory_histories, images, wishlists
  // Preserved: snapshots (for audit trail), order_items (for order history)
  await MyGlobal.prisma.shopping_mall_products.update({
    where: { id: props.productId },
    data: { deleted_at: new Date() },
  });
}
