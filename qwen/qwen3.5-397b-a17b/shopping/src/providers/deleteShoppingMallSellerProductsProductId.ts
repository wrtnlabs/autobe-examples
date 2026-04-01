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
  // 1. Verify product exists and belongs to the seller
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
    });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Check if already deleted
  if (product.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  // 2. Check for pending order items (paid or shipped status) for any variant of this product
  const pendingOrderItems =
    await MyGlobal.prisma.shopping_mall_order_items.findFirst({
      where: {
        shopping_mall_product_id: props.productId,
        status: {
          in: ["paid", "shipped"],
        },
        deleted_at: null,
      },
    });
  if (pendingOrderItems !== null) {
    throw new HttpException(
      "Conflict: Cannot delete product with pending orders",
      409,
    );
  }
  // 3. Check for pending cancellation requests for any variant of this product
  const pendingCancellationRequests =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findFirst({
      where: {
        orderItem: {
          shopping_mall_product_id: props.productId,
        },
        status: "pending",
        deleted_at: null,
      },
    });
  if (pendingCancellationRequests !== null) {
    throw new HttpException(
      "Conflict: Cannot delete product with pending cancellation requests",
      409,
    );
  }
  // 4. Check for pending refund requests for any variant of this product
  const pendingRefundRequests =
    await MyGlobal.prisma.shopping_mall_refund_requests.findFirst({
      where: {
        orderItem: {
          shopping_mall_product_id: props.productId,
        },
        status: "pending",
        deleted_at: null,
      },
    });
  if (pendingRefundRequests !== null) {
    throw new HttpException(
      "Conflict: Cannot delete product with pending refund requests",
      409,
    );
  }
  // 5. Soft-delete the product by setting deleted_at
  await MyGlobal.prisma.shopping_mall_products.update({
    where: { id: props.productId },
    data: {
      deleted_at: new Date(),
    },
  });
}
