import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderItemVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantOption";
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

export async function putShoppingMallSellerCancellationRequestsCancellationRequestIdApprove(props: {
  seller: SellerPayload;
  cancellationRequestId: string;
  body: IShoppingMallCancellationRequest.IApprove;
}): Promise<IShoppingMallCancellationRequest> {
  // Fetch cancellation request with order item
  const request =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findUnique({
      where: { id: props.cancellationRequestId },
      select: {
        id: true,
        reason: true,
        status: true,
        order_item_id: true,
        orderItem: {
          select: {
            id: true,
            status: true,
            shopping_mall_seller_id: true,
            shopping_mall_product_variant_id: true,
            quantity: true,
          },
        },
      },
    });
  if (!request) {
    throw new HttpException("Cancellation request not found", 404);
  }
  if (request.status !== "pending") {
    throw new HttpException("Request already processed", 400);
  }
  // Validate seller authorization - seller must own the order item
  if (request.orderItem.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate order item is paid (not shipped/delivered)
  if (request.orderItem.status !== "paid") {
    throw new HttpException("Order item already shipped or processed", 400);
  }
  // Validate variant exists for inventory restoration
  if (!request.orderItem.shopping_mall_product_variant_id) {
    throw new HttpException(
      "Product variant not found for inventory restoration",
      400,
    );
  }
  const now = new Date();
  // Execute transaction atomically
  await MyGlobal.prisma.$transaction([
    // Update cancellation request status
    MyGlobal.prisma.shopping_mall_cancellation_requests.update({
      where: { id: props.cancellationRequestId },
      data: {
        status: "approved",
        seller_response: props.body.seller_response ?? null,
        updated_at: now,
      },
    }),
    // Create immutable snapshot for audit trail
    MyGlobal.prisma.shopping_mall_cancellation_request_snapshots.create({
      data: {
        id: v4(),
        shopping_mall_cancellation_request_id: props.cancellationRequestId,
        previous_status: "pending",
        new_status: "approved",
        reason: request.reason,
        seller_response: props.body.seller_response ?? null,
        rejection_reason: null,
        created_at: now,
      },
    }),
    // Update order item status to cancelled
    MyGlobal.prisma.shopping_mall_order_items.update({
      where: { id: request.order_item_id },
      data: {
        status: "cancelled",
      },
    }),
    // Restore inventory for the cancelled variant
    MyGlobal.prisma.shopping_mall_product_inventory_histories.create({
      data: {
        id: v4(),
        shopping_mall_product_variant_id:
          request.orderItem.shopping_mall_product_variant_id,
        quantity_change: request.orderItem.quantity,
        reason: "cancellation",
        created_at: now,
      },
    }),
  ]);
  // Fetch and return updated cancellation request with relations
  const updated =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.cancellationRequestId },
        ...ShoppingMallCancellationRequestTransformer.select(),
      },
    );
  return await ShoppingMallCancellationRequestTransformer.transform(updated);
}
