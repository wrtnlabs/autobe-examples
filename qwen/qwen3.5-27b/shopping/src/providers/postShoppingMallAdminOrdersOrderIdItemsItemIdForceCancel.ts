import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallOrderItemTransformer } from "../transformers/ShoppingMallOrderItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdminOrdersOrderIdItemsItemIdForceCancel(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderItem.IForceCancel;
}): Promise<IShoppingMallOrderItem> {
  // Verify order exists and is not deleted
  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: {
      id: props.orderId,
      deleted_at: null,
    },
    select: {
      id: true,
      status: true,
    },
  });
  // Verify order item exists, belongs to order, and is not deleted
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
        quantity: true,
      },
    });
  // Check if item is already cancelled or refunded
  if (orderItem.status === "cancelled" || orderItem.status === "refunded") {
    throw new HttpException(
      `Order item is already ${orderItem.status} and cannot be force-cancelled again`,
      400,
    );
  }
  const previousStatus = orderItem.status;
  const now = new Date();
  // Update order item status to cancelled
  await MyGlobal.prisma.shopping_mall_order_items.update({
    where: { id: props.itemId },
    data: {
      status: "cancelled",
      updated_at: now,
    },
  });
  // Create cancellation snapshot for admin force cancellation
  const snapshotId = v4();
  const fakeRequestId = v4();
  await MyGlobal.prisma.shopping_mall_cancellation_snapshots.create({
    data: {
      id: snapshotId,
      shopping_mall_cancellation_request_id: fakeRequestId,
      snapshot_data: JSON.stringify({
        order_item_id: props.itemId,
        order_id: props.orderId,
        previous_status: previousStatus,
        new_status: "cancelled",
        admin_id: props.admin.id,
        admin_reason: props.body.reason,
        admin_notes: props.body.notes ?? null,
        cancelled_at: now.toISOString(),
        cancellation_type: "admin_force_cancel",
      }),
      created_at: now,
    },
  });
  // Recalculate order status based on all items
  const allItems = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: {
      shopping_mall_order_id: props.orderId,
      deleted_at: null,
    },
    select: {
      status: true,
    },
  });
  const allCancelled = allItems.every((item) => item.status === "cancelled");
  const allRefunded = allItems.every((item) => item.status === "refunded");
  const hasAnyActive = allItems.some(
    (item) =>
      item.status === "paid" ||
      item.status === "shipped" ||
      item.status === "delivered",
  );
  if (allCancelled && order.status !== "cancelled") {
    await MyGlobal.prisma.shopping_mall_orders.update({
      where: { id: props.orderId },
      data: {
        status: "cancelled",
        updated_at: now,
      },
    });
  } else if (allRefunded && order.status !== "refunded") {
    await MyGlobal.prisma.shopping_mall_orders.update({
      where: { id: props.orderId },
      data: {
        status: "refunded",
        updated_at: now,
      },
    });
  } else if (
    hasAnyActive &&
    allItems.some(
      (item) => item.status === "cancelled" || item.status === "refunded",
    ) &&
    order.status !== "partially_completed"
  ) {
    await MyGlobal.prisma.shopping_mall_orders.update({
      where: { id: props.orderId },
      data: {
        status: "partially_completed",
        updated_at: now,
      },
    });
  }
  // Return updated order item using transformer
  const updatedItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      ...ShoppingMallOrderItemTransformer.select(),
    });
  return await ShoppingMallOrderItemTransformer.transform(updatedItem);
}
