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

export async function putShoppingMallSellerCancellationRequestsCancellationRequestIdRespond(props: {
  seller: SellerPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
  body: IShoppingMallCancellationRequest.IRespond;
}): Promise<IShoppingMallCancellationRequest> {
  // Check seller is not banned (suspended sellers CAN respond)
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
    where: { id: props.seller.id },
    select: { id: true, banned: true },
  });
  if (seller.banned) {
    throw new HttpException("Forbidden", 403);
  }
  // Find cancellation request with order item and product for ownership verification
  const cancellationRequest =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.cancellationRequestId },
        select: {
          id: true,
          reason: true,
          status: true,
          shopping_mall_order_item_id: true,
          shopping_mall_seller_id: true,
          created_at: true,
          updated_at: true,
          responded_at: true,
          orderItem: {
            select: {
              id: true,
              shopping_mall_seller_id: true,
              shopping_mall_product_variant_id: true,
              quantity: true,
              product: {
                select: {
                  shopping_mall_seller_id: true,
                },
              },
            },
          },
        },
      },
    );
  // Validate status is 'pending'
  if (cancellationRequest.status !== "pending") {
    throw new HttpException("Cancellation request is not pending", 400);
  }
  // Verify seller owns the product (join through order_item → product)
  if (
    cancellationRequest.orderItem.product.shopping_mall_seller_id !==
    props.seller.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  const now = new Date();
  const newStatus = props.body.status;
  // Execute all updates in a transaction
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    // Update cancellation request
    const updated = await tx.shopping_mall_cancellation_requests.update({
      where: { id: props.cancellationRequestId },
      data: {
        status: newStatus,
        shopping_mall_seller_id: props.seller.id,
        responded_at: now,
        updated_at: now,
      },
      ...ShoppingMallCancellationRequestTransformer.select(),
    });
    // Create snapshot for audit trail
    await tx.shopping_mall_cancellation_request_snapshots.create({
      data: {
        id: v4(),
        shopping_mall_cancellation_request_id: props.cancellationRequestId,
        reason: cancellationRequest.reason,
        status: newStatus,
        created_at: now,
      },
    });
    // If approved, update order item status and restore stock
    if (newStatus === "approved") {
      // Update order item status to 'cancelled'
      await tx.shopping_mall_order_items.update({
        where: { id: cancellationRequest.shopping_mall_order_item_id },
        data: {
          status: "cancelled",
          updated_at: now,
        },
      });
      // Create inventory record to restore stock
      await tx.shopping_mall_inventory_records.create({
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
    }
    return updated;
  });
  return await ShoppingMallCancellationRequestTransformer.transform(result);
}
