import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallOrderItemTransformer } from "../transformers/EcommerceMallOrderItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAdminOrdersOrderIdItemsItemIdForceCancel(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  body: IEcommerceMallOrderItem.IForceCancel;
}): Promise<IEcommerceMallOrderItem> {
  // 1. Verify order exists and is not soft-deleted
  await MyGlobal.prisma.ecommerce_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId, deleted_at: null },
  });
  // 2. Verify order item exists and belongs to the specified order
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      select: {
        id: true,
        ecommerce_mall_order_id: true,
        quantity: true,
        ecommerce_mall_product_variant_id: true,
        status: true,
      },
    });
  if (orderItem.ecommerce_mall_order_id !== props.orderId) {
    throw new HttpException(
      "Order item does not belong to the specified order",
      400,
    );
  }
  // 3. Update order item status to cancelled
  await MyGlobal.prisma.ecommerce_mall_order_items.update({
    where: { id: props.itemId },
    data: {
      status: "cancelled",
      updated_at: new Date(),
    },
  });
  // 4. Create inventory record for stock restoration
  const inventoryRecord =
    await MyGlobal.prisma.ecommerce_mall_inventory_records.create({
      data: {
        id: v4(),
        ecommerce_mall_product_variant_id:
          orderItem.ecommerce_mall_product_variant_id,
        quantity_change: orderItem.quantity,
        reason: `admin_force_cancel: ${props.body.reason}`,
        current_stock: 0,
        recorded_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  // 5. Create snapshot for audit trail
  await MyGlobal.prisma.ecommerce_mall_order_item_snapshots.create({
    data: {
      id: v4(),
      order_item_id: props.itemId,
      snapshot_type: "cancellation",
      previous_values: JSON.stringify({
        status: orderItem.status,
        quantity: orderItem.quantity,
      }),
      current_values: JSON.stringify({
        status: "cancelled",
        quantity: orderItem.quantity,
      }),
      created_at: new Date(),
    },
  });
  // 6. Recalculate order status based on remaining items
  const orderItems = await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
    where: { ecommerce_mall_order_id: props.orderId, deleted_at: null },
    select: { status: true },
  });
  const statuses = orderItems.map((item) => item.status);
  const allCancelled = statuses.every((s) => s === "cancelled");
  const allRefunded = statuses.every((s) => s === "refunded");
  const hasCancelled = statuses.some((s) => s === "cancelled");
  const hasRefunded = statuses.some((s) => s === "refunded");
  const hasDelivered = statuses.some((s) => s === "delivered");
  const hasShipped = statuses.some((s) => s === "shipped");
  const hasPaid = statuses.some((s) => s === "paid");
  let newOrderStatus: string;
  if (allRefunded) {
    newOrderStatus = "refunded";
  } else if (allCancelled) {
    newOrderStatus = "cancelled";
  } else if (hasRefunded || hasCancelled) {
    newOrderStatus = "partiallyCompleted";
  } else if (hasDelivered) {
    newOrderStatus = "delivered";
  } else if (hasShipped) {
    newOrderStatus = "shipped";
  } else if (hasPaid) {
    newOrderStatus = "paid";
  } else {
    newOrderStatus = "cancelled";
  }
  await MyGlobal.prisma.ecommerce_mall_orders.update({
    where: { id: props.orderId },
    data: {
      status: newOrderStatus,
      updated_at: new Date(),
    },
  });
  // 7. Return updated order item
  const updated =
    await MyGlobal.prisma.ecommerce_mall_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      ...EcommerceMallOrderItemTransformer.select(),
    });
  return await EcommerceMallOrderItemTransformer.transform(updated);
}
