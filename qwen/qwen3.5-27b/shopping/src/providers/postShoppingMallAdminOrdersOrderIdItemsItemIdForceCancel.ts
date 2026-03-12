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
  // Verify order exists
  await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: {
      id: props.orderId,
      deleted_at: null,
    },
  });
  // Verify order item exists and belongs to the order
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: {
        id: props.itemId,
        shopping_mall_order_id: props.orderId,
        deleted_at: null,
      },
    });
  // Check if already cancelled or refunded
  if (orderItem.status === "cancelled" || orderItem.status === "refunded") {
    throw new HttpException("Order item is already cancelled or refunded", 400);
  }
  // Update order item status to cancelled
  await MyGlobal.prisma.shopping_mall_order_items.update({
    where: {
      id: props.itemId,
    },
    data: {
      status: "cancelled",
      updated_at: new Date(),
    },
  });
  // Create cancellation snapshot for admin force cancellation
  const snapshotId = v4();
  await MyGlobal.prisma.shopping_mall_cancellation_snapshots.create({
    data: {
      id: snapshotId,
      shopping_mall_cancellation_request_id: props.itemId,
      snapshot_data: JSON.stringify({
        order_item_id: props.itemId,
        order_id: props.orderId,
        previous_status: orderItem.status,
        new_status: "cancelled",
        cancellation_type: "admin_force_cancel",
        admin_id: props.admin.id,
        admin_session_id: props.admin.session_id,
        reason: props.body.reason,
        notes: props.body.notes ?? null,
        cancelled_at: new Date().toISOString(),
      }),
      created_at: new Date(),
    },
  });
  // Recalculate order status based on all item statuses
  const orderItems = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: {
      shopping_mall_order_id: props.orderId,
      deleted_at: null,
    },
    select: {
      status: true,
    },
  });
  const allCancelled = orderItems.every((item) => item.status === "cancelled");
  if (allCancelled) {
    await MyGlobal.prisma.shopping_mall_orders.update({
      where: {
        id: props.orderId,
      },
      data: {
        status: "cancelled",
        updated_at: new Date(),
      },
    });
  }
  // Return updated order item using transformer
  const updated =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: {
        id: props.itemId,
      },
      ...ShoppingMallOrderItemTransformer.select(),
    });
  return await ShoppingMallOrderItemTransformer.transform(updated);
}
