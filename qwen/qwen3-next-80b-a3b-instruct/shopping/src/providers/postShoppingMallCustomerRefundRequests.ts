import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerRefundRequests(props: {
  customer: CustomerPayload;
  body: IShoppingMallRefundRequest.ICreate;
}): Promise<IShoppingMallRefundRequest> {
  // Verify order item exists and has 'delivered' status
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findUnique({
    where: { id: props.body.order_item_id },
    select: {
      id: true,
      status: true,
      deleted_at: true,
      order_id: true,
    },
  });
  // Validate order item exists
  if (!orderItem) {
    throw new HttpException("Order item not found", 404);
  }
  // Validate status is 'delivered'
  if (orderItem.status !== "delivered") {
    throw new HttpException("Order item is not delivered", 400);
  }
  // Validate delivery date is within 7 calendar days
  // Use Date object internally for calculation (not exposed in API)
  if (orderItem.deleted_at === null) {
    throw new HttpException("Order item delivery date is not available", 400);
  }
  const deliveryDate = new Date(orderItem.deleted_at);
  const today = new Date();
  const timeDiff = today.getTime() - deliveryDate.getTime();
  const dayDiff = timeDiff / (1000 * 60 * 60 * 24);
  // If more than 7 days have passed, reject
  if (dayDiff > 7) {
    throw new HttpException(
      "Refund request must be submitted within 7 calendar days of delivery",
      400,
    );
  }
  // Verify customer owns this order item
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: orderItem.order_id },
    select: { customer_id: true },
  });
  if (!order || order.customer_id !== props.customer.id) {
    throw new HttpException(
      "You are not authorized to request a refund for this order item",
      403,
    );
  }
  // Create the refund request
  const refundRequest =
    await MyGlobal.prisma.shopping_mall_refund_requests.create({
      data: {
        id: v4(),
        order_item_id: props.body.order_item_id,
        customer_id: props.customer.id,
        reason: props.body.reason,
        requested_at: toISOStringSafe(new Date()),
        status: "pending",
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    });
  // Return the expected IShoppingMallRefundRequest response
  return {
    status: "approved",
    message: "Refund request submitted successfully",
  };
}
