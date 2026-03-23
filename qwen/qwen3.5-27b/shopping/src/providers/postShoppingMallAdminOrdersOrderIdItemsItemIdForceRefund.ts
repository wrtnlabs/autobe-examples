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
  // Validate order exists and is not deleted
  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: {
      id: props.orderId,
      deleted_at: null,
    },
    select: {
      id: true,
      shopping_mall_customer_id: true,
    },
  });
  // Validate order item exists, belongs to order, not deleted, and status allows refund
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: {
        id: props.itemId,
        shopping_mall_order_id: props.orderId,
        deleted_at: null,
      },
      select: {
        id: true,
        status: true,
        shopping_mall_seller_id: true,
        quantity: true,
        variant_snapshot: true,
      },
    });
  // Check if item status allows refund (not already refunded or cancelled)
  if (orderItem.status === "refunded" || orderItem.status === "cancelled") {
    throw new HttpException("Order item cannot be refunded", 409);
  }
  // Generate timestamps
  const now = new Date();
  const nowString = toISOStringSafe(now);
  // Create refund request with approved status - use transformer select only
  const refundRequest =
    await MyGlobal.prisma.shopping_mall_refund_requests.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shopping_mall_order_item_id: props.itemId,
        shopping_mall_customer_id: order.shopping_mall_customer_id,
        shopping_mall_customer_session_id: "",
        reason: props.body.reason,
        status: "approved",
        requested_at: now,
        responded_at: now,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      ...ShoppingMallRefundRequestTransformer.select(),
    });
  // Update order item status to refunded
  await MyGlobal.prisma.shopping_mall_order_items.update({
    where: { id: props.itemId },
    data: {
      status: "refunded",
      updated_at: now,
    },
  });
  // Create refund snapshot for audit trail
  await MyGlobal.prisma.shopping_mall_refund_snapshots.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_refund_request_id: refundRequest.id,
      snapshot_data: JSON.stringify({
        reason: props.body.reason,
        status: "approved",
        responded_at: nowString,
        admin_id: props.admin.id,
      }),
      created_at: now,
    },
  });
  // Recalculate order status based on all order items
  const allOrderItems =
    await MyGlobal.prisma.shopping_mall_order_items.findMany({
      where: {
        shopping_mall_order_id: props.orderId,
        deleted_at: null,
      },
      select: {
        status: true,
      },
    });
  // Determine new order status
  const statuses = allOrderItems.map((item) => item.status);
  const allRefunded = statuses.every((s) => s === "refunded");
  const allCancelled = statuses.every((s) => s === "cancelled");
  const hasRefundedOrCancelled = statuses.some(
    (s) => s === "refunded" || s === "cancelled",
  );
  const hasDelivered = statuses.some((s) => s === "delivered");
  const hasShipped = statuses.some((s) => s === "shipped");
  let newOrderStatus = "paid";
  if (allRefunded) {
    newOrderStatus = "refunded";
  } else if (allCancelled) {
    newOrderStatus = "cancelled";
  } else if (hasRefundedOrCancelled) {
    newOrderStatus = "partially_completed";
  } else if (hasDelivered) {
    newOrderStatus = "delivered";
  } else if (hasShipped) {
    newOrderStatus = "shipped";
  }
  await MyGlobal.prisma.shopping_mall_orders.update({
    where: { id: props.orderId },
    data: {
      status: newOrderStatus,
      updated_at: now,
    },
  });
  return await ShoppingMallRefundRequestTransformer.transform(refundRequest);
}
