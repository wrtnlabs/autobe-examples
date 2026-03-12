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
        shopping_mall_order_id: props.orderId,
        deleted_at: null,
      },
      select: {
        id: true,
        status: true,
      },
    });
  const newStatus = props.body.status;
  if (newStatus === undefined) {
    throw new HttpException("Status is required", 400);
  }
  const validStatuses: string[] = [
    "paid",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
  ];
  if (!validStatuses.includes(newStatus)) {
    throw new HttpException("Invalid status value", 400);
  }
  const currentStatus = orderItem.status;
  const validTransitions: Record<string, string[]> = {
    paid: ["shipped", "cancelled"],
    shipped: ["delivered"],
    delivered: ["refunded"],
    cancelled: [],
    refunded: [],
  };
  if (!validTransitions[currentStatus].includes(newStatus)) {
    throw new HttpException("Invalid status transition", 400);
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
  const updatedOrderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: {
        id: props.itemId,
      },
      ...ShoppingMallOrderItemTransformer.select(),
    });
  const orderItems = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: {
      shopping_mall_order_id: props.orderId,
      deleted_at: null,
    },
    select: {
      status: true,
    },
  });
  const statuses = orderItems.map((item) => item.status);
  const allDelivered = statuses.every((s) => s === "delivered");
  const allCancelled = statuses.every((s) => s === "cancelled");
  const allRefunded = statuses.every((s) => s === "refunded");
  const hasCancelled = statuses.some((s) => s === "cancelled");
  const hasRefunded = statuses.some((s) => s === "refunded");
  const allShipped = statuses.every((s) => s === "shipped");
  const allPaid = statuses.every((s) => s === "paid");
  let newOrderStatus: string = "partially_completed";
  if (allDelivered) {
    newOrderStatus = "delivered";
  } else if (allCancelled) {
    newOrderStatus = "cancelled";
  } else if (allRefunded) {
    newOrderStatus = "refunded";
  } else if (allShipped) {
    newOrderStatus = "shipped";
  } else if (allPaid) {
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
  return await ShoppingMallOrderItemTransformer.transform(updatedOrderItem);
}
