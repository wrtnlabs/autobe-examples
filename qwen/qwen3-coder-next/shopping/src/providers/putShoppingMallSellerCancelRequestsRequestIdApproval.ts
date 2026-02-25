import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellationRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallOrderCancellationRequestTransformer } from "../transformers/ShoppingMallOrderCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSellerCancelRequestsRequestIdApproval(props: {
  seller: SellerPayload;
  requestId: string;
  body: IShoppingMallOrderCancellationRequest.IApproval;
}): Promise<IShoppingMallOrderCancellationRequest> {
  // Fetch existing cancellation request with relationships
  const request =
    await MyGlobal.prisma.shopping_mall_order_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        select: {
          id: true,
          order_item_id: true,
          status: true,
          reason: true,
          rejection_reason: true,
          customer_id: true,
          seller: {
            select: {
              id: true,
            },
          },
          responded_by: true,
          created_at: true,
          responded_at: true,
          deleted_at: true,
          orderItem: {
            select: {
              id: true,
              shopping_mall_order_id: true,
              quantity: true,
              total_price: true,
            },
          },
          customer: {
            select: {
              id: true,
            },
          },
        },
      },
    );
  // Validate request is in pending status
  if (request.status !== "pending") {
    throw new HttpException(
      `Cancellation request already ${request.status}`,
      400,
    );
  }
  // Validate seller owns the order item by checking through order
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: request.order_item_id },
      select: {
        id: true,
        shopping_mall_seller_id: true,
      },
    });
  if (orderItem.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden: Seller does not own this order", 403);
  }
  // Create audit log entry
  const logId = v4();
  await MyGlobal.prisma.shopping_mall_order_cancellation_request_logs.create({
    data: {
      id: logId,
      shopping_mall_order_cancellation_request_id: props.requestId,
      responded_by: props.seller.id,
      from_status: "pending",
      to_status: props.body.status,
      rejection_reason:
        props.body.status === "rejected" ? props.body.rejection_reason : null,
      created_at: toISOStringSafe(new Date()),
    },
  });
  // Update the cancellation request
  const updatedRequest =
    await MyGlobal.prisma.shopping_mall_order_cancellation_requests.update({
      where: { id: props.requestId },
      data: {
        status: props.body.status,
        rejection_reason:
          props.body.status === "rejected" ? props.body.rejection_reason : null,
        responded_by: props.seller.id,
        responded_at: toISOStringSafe(new Date()),
      },
      select: {
        id: true,
        order_item_id: true,
        customer_id: true,
        reason: true,
        status: true,
        rejection_reason: true,
        responded_by: true,
        created_at: true,
        responded_at: true,
        deleted_at: true,
        orderItem: {
          select: {
            id: true,
            shopping_mall_order_id: true,
            quantity: true,
            total_price: true,
          },
        },
        customer: {
          select: {
            id: true,
          },
        },
        seller: {
          select: {
            id: true,
          },
        },
      },
    });
  // If approved, process refund and restore inventory
  if (props.body.status === "approved") {
    // Restore inventory
    await MyGlobal.prisma.shopping_mall_inventory_histories.create({
      data: {
        id: v4(),
        shopping_mall_product_variant_id:
          request.orderItem?.shopping_mall_product_variant_id,
        shopping_mall_order_item_id: request.order_item_id,
        quantity_change: request.orderItem?.quantity,
        reason: "order_cancellation",
        created_at: toISOStringSafe(new Date()),
      },
    });
    // Update order item status
    await MyGlobal.prisma.shopping_mall_order_items.update({
      where: { id: request.order_item_id },
      data: {
        item_status: "cancelled",
      },
    });
    // Process refund (if payment exists)
    const payment = await MyGlobal.prisma.shopping_mall_payments.findFirst({
      where: {
        shopping_mall_order_id: request.orderItem?.shopping_mall_order_id,
        status: "paid",
      },
    });
    if (payment) {
      await MyGlobal.prisma.shopping_mall_refund_payments.create({
        data: {
          id: v4(),
          payment_id: payment.id,
          shopping_mall_order_item_id: request.order_item_id,
          amount: request.orderItem?.total_price,
          status: "refunded",
          created_at: toISOStringSafe(new Date()),
        },
      });
    }
  }
  // Transform and return the result
  return await ShoppingMallOrderCancellationRequestTransformer.transform(
    updatedRequest,
  );
}
