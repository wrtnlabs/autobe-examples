import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallCancellationRequestTransformer } from "../transformers/ShoppingMallCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSellerCancellationRequestsCancellationRequestId(props: {
  seller: SellerPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
  body: IShoppingMallCancellationRequest.IUpdate;
}): Promise<IShoppingMallCancellationRequest> {
  // 1. Fetch cancellation request with order item for validation
  const cancellationRequest =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.cancellationRequestId },
        select: {
          reason: true,
          status: true,
          shopping_mall_order_item_id: true,
          orderItem: {
            select: {
              shopping_mall_seller_id: true,
              shopping_mall_product_variant_id: true,
              quantity: true,
            },
          },
        },
      },
    );
  // 2. Validate status is 'pending' (status finality - cannot respond to already resolved requests)
  if (cancellationRequest.status !== "pending") {
    throw new HttpException(
      "Cancellation request has already been resolved",
      409,
    );
  }
  // 3. Validate seller owns the product (seller response authority validation)
  if (
    cancellationRequest.orderItem.shopping_mall_seller_id !== props.seller.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  const now = new Date();
  // 4. Create immutable snapshot before updating (preserves request state for audit trail)
  await MyGlobal.prisma.shopping_mall_cancellation_request_snapshots.create({
    data: {
      id: v4(),
      shopping_mall_cancellation_request_id: props.cancellationRequestId,
      reason: cancellationRequest.reason,
      status: props.body.status,
      created_at: now,
    },
  });
  // 5. Update cancellation request with seller's response
  const updated =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.update({
      where: { id: props.cancellationRequestId },
      data: {
        status: props.body.status,
        shopping_mall_seller_id: props.seller.id,
        responded_at: now,
        updated_at: now,
      },
      ...ShoppingMallCancellationRequestTransformer.select(),
    });
  // 6. If approved: restore stock and update order item status to cancelled
  if (props.body.status === "approved") {
    // Restore stock via positive inventory record
    await MyGlobal.prisma.shopping_mall_inventory_records.create({
      data: {
        id: v4(),
        variant_id:
          cancellationRequest.orderItem.shopping_mall_product_variant_id,
        cancellation_request_id: props.cancellationRequestId,
        quantity_change: cancellationRequest.orderItem.quantity,
        reason: "Cancellation approved",
        created_at: now,
      },
    });
    // Update order item status to cancelled
    await MyGlobal.prisma.shopping_mall_order_items.update({
      where: { id: cancellationRequest.shopping_mall_order_item_id },
      data: {
        status: "cancelled",
        updated_at: now,
      },
    });
  }
  // 7. Return transformed result with full order item and seller details
  return ShoppingMallCancellationRequestTransformer.transform(updated);
}
