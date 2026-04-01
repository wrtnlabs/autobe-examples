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

export async function putShoppingMallAdminOrdersOrderIdItemsItemId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderItem.IUpdate;
}): Promise<IShoppingMallOrderItem> {
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: {
        id: props.itemId,
        deleted_at: null,
      },
      select: {
        id: true,
        shopping_mall_order_id: true,
        status: true,
      },
    });
  if (orderItem.shopping_mall_order_id !== props.orderId) {
    throw new HttpException("Order item not found in specified order", 404);
  }
  if (props.body.status !== undefined) {
    const currentStatus = orderItem.status;
    const newStatus = props.body.status;
    const validTransitions: Record<string, string[]> = {
      paid: ["shipped", "cancelled"],
      shipped: ["delivered"],
      delivered: ["refunded"],
      cancelled: [],
      refunded: [],
    };
    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new HttpException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
        400,
      );
    }
    await MyGlobal.prisma.shopping_mall_order_items.update({
      where: {
        id: props.itemId,
      },
      data: {
        status: newStatus,
        updated_at: new Date(),
      },
    });
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
    const statuses = allOrderItems.map((item) => item.status);
    const hasCancelled = statuses.some((s) => s === "cancelled");
    const hasRefunded = statuses.some((s) => s === "refunded");
    const hasDelivered = statuses.some((s) => s === "delivered");
    const hasShipped = statuses.some((s) => s === "shipped");
    const hasPaid = statuses.some((s) => s === "paid");
    let newOrderStatus: string;
    if (hasCancelled || hasRefunded) {
      if (statuses.every((s) => s === "cancelled" || s === "refunded")) {
        newOrderStatus = "cancelled";
      } else {
        newOrderStatus = "partially_completed";
      }
    } else if (hasDelivered) {
      if (statuses.every((s) => s === "delivered")) {
        newOrderStatus = "delivered";
      } else {
        newOrderStatus = "partially_completed";
      }
    } else if (hasShipped) {
      if (statuses.every((s) => s === "shipped")) {
        newOrderStatus = "shipped";
      } else {
        newOrderStatus = "partially_completed";
      }
    } else if (hasPaid) {
      newOrderStatus = "paid";
    } else {
      newOrderStatus = "paid";
    }
    await MyGlobal.prisma.shopping_mall_orders.update({
      where: {
        id: props.orderId,
      },
      data: {
        status: newOrderStatus,
      },
    });
  }
  const updated =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: {
        id: props.itemId,
      },
      ...ShoppingMallOrderItemTransformer.select(),
    });
  return await ShoppingMallOrderItemTransformer.transform(updated);
}
