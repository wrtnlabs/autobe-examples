import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallRefundRequestTransformer } from "../transformers/ShoppingMallRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdminOrdersOrderIdItemsItemIdForceRefund(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  body: IShoppingMallRefundRequest.IForceRefund;
}): Promise<IShoppingMallRefundRequest> {
  // Retrieve the order
  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: { id: true, shopping_mall_customer_id: true },
  });
  // Retrieve the order item
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      select: {
        id: true,
        status: true,
        shopping_mall_order_id: true,
      },
    });
  // Verify the item belongs to the specified order
  if (orderItem.shopping_mall_order_id !== props.orderId) {
    throw new HttpException("Order item not found in specified order", 404);
  }
  // Check if item is already refunded or cancelled
  if (orderItem.status === "refunded" || orderItem.status === "cancelled") {
    throw new HttpException("Order item cannot be refunded", 409);
  }
  const now = new Date();
  // Create refund request with approved status (force-approved by admin)
  const refundRequest =
    await MyGlobal.prisma.shopping_mall_refund_requests.create({
      data: {
        id: v4(),
        shopping_mall_order_item_id: props.itemId,
        shopping_mall_customer_id: order.shopping_mall_customer_id,
        shopping_mall_customer_session_id: v4(),
        reason: props.body.reason,
        status: "approved",
        requested_at: now,
        responded_at: now,
        created_at: now,
        updated_at: now,
      },
      ...ShoppingMallRefundRequestTransformer.select(),
    });
  // Update order item status to refunded
  await MyGlobal.prisma.shopping_mall_order_items.update({
    where: { id: props.itemId },
    data: { status: "refunded", updated_at: now },
  });
  // Create refund snapshot for audit trail
  await MyGlobal.prisma.shopping_mall_refund_snapshots.create({
    data: {
      id: v4(),
      shopping_mall_refund_request_id: refundRequest.id,
      snapshot_data: JSON.stringify({
        reason: props.body.reason,
        status: "approved",
        responded_at: toISOStringSafe(now),
        admin_id: props.admin.id,
      }),
      created_at: now,
    },
  });
  // Recalculate and update order status based on all items
  const allOrderItems =
    await MyGlobal.prisma.shopping_mall_order_items.findMany({
      where: { shopping_mall_order_id: props.orderId, deleted_at: null },
      select: { status: true },
    });
  const statuses = allOrderItems.map((item) => item.status);
  const allRefunded = statuses.every((s) => s === "refunded");
  const allCancelled = statuses.every((s) => s === "cancelled");
  const hasRefundedOrCancelled = statuses.some(
    (s) => s === "refunded" || s === "cancelled",
  );
  const allDelivered = statuses.every((s) => s === "delivered");
  let newOrderStatus: string;
  if (allRefunded) {
    newOrderStatus = "refunded";
  } else if (allCancelled) {
    newOrderStatus = "cancelled";
  } else if (hasRefundedOrCancelled) {
    newOrderStatus = "partially_completed";
  } else if (allDelivered) {
    newOrderStatus = "delivered";
  } else {
    newOrderStatus = "shipped";
  }
  await MyGlobal.prisma.shopping_mall_orders.update({
    where: { id: props.orderId },
    data: { status: newOrderStatus, updated_at: now },
  });
  // Return the created refund request using transformer
  return await ShoppingMallRefundRequestTransformer.transform(refundRequest);
}
