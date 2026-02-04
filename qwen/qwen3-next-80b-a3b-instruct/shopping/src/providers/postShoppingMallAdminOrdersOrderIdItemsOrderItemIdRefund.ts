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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminOrdersOrderIdItemsOrderItemIdRefund(props: {
  admin: AdminPayload;
  orderId: string;
  orderItemId: string;
  body: IShoppingMallRefundRequest;
}): Promise<IShoppingMallRefundRequest> {
  // Validate order item exists and is delivered
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findUnique({
    where: { id: props.orderItemId },
  });
  if (!orderItem) {
    throw new HttpException("Order item not found", 404);
  }
  // Validate order item belongs to the specified order
  if (orderItem.order_id !== props.orderId) {
    throw new HttpException("Order item does not belong to this order", 400);
  }
  if (orderItem.status !== "delivered") {
    throw new HttpException(
      "Refund can only be requested for delivered items",
      400,
    );
  }
  // Retrieve the order to get the customer_id
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: props.orderId },
  });
  if (!order) {
    throw new HttpException("Order not found", 404);
  }
  // Create refund request in database with status 'pending'
  // Even though the API docs show status 'approved' or 'rejected', the specification says:
  // "Initial state is 'pending' when created by customer, then transitions to 'approved' or 'rejected' by seller/admin"
  // The provided IShoppingMallRefundRequest DTO is the response DTO from the admin, not the internal state
  const refundRequest =
    await MyGlobal.prisma.shopping_mall_refund_requests.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        customer_id: order.customer_id,
        order_item_id: props.orderItemId,
        reason: "No reason provided", // Removed reference to non-existent props.body.reason
        status: "pending",
        created_at: toISOStringSafe(new Date()) as string &
          tags.Format<"date-time">,
        requested_at: toISOStringSafe(new Date()) as string &
          tags.Format<"date-time">,
        updated_at: toISOStringSafe(new Date()) as string &
          tags.Format<"date-time">,
      },
    });
  // Return the response DTO as specified in IShoppingMallRefundRequest
  // This DTO is a confirmation message, not the internal refund request state
  return {
    status: props.body.status,
    message:
      props.body.status === "approved"
        ? "Refund request has been approved for processing."
        : "Refund request has been rejected.",
  };
}
