import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { IShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallOrderItemTransformer } from "../transformers/ShoppingMallOrderItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallMemberOrderItemsOrderItemId(props: {
  member: MemberPayload;
  orderItemId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderItem.IUpdate;
}): Promise<IShoppingMallOrderItem> {
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.orderItemId },
      select: {
        id: true,
        shopping_mall_order_id: true,
        line_item_status: true,
        shopping_mall_shipment_id: true,
        deleted_at: true,
      },
    });
  if (orderItem.deleted_at !== null) {
    throw new HttpException("Order item is not available", 404);
  }
  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: orderItem.shopping_mall_order_id },
    select: {
      id: true,
      deleted_at: true,
      shopping_customer_id: true,
    },
  });
  if (order.deleted_at !== null) {
    throw new HttpException("Order is not available", 404);
  }
  if (order.shopping_customer_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const currentStatus = orderItem.line_item_status;
  const terminalStatuses = new Set<string>([
    "cancelled",
    "refunded",
    "delivered",
  ]);
  const requestedShipmentId = props.body.shopping_mall_shipment_id;
  if (props.body.line_item_status !== undefined) {
    const nextStatus = props.body.line_item_status;
    if (terminalStatuses.has(currentStatus) && nextStatus !== currentStatus) {
      throw new HttpException("Invalid status transition", 409);
    }
    if (requestedShipmentId !== undefined && requestedShipmentId !== null) {
      if (!["shipped", "delivered"].includes(nextStatus)) {
        throw new HttpException(
          "Invalid shipment linkage for the given status",
          409,
        );
      }
    }
  }
  if (
    props.body.quantity !== undefined ||
    props.body.seller_price_at_purchase !== undefined
  ) {
    if (terminalStatuses.has(currentStatus)) {
      throw new HttpException(
        "Cannot edit quantity/price in terminal state",
        409,
      );
    }
  }
  const data: Prisma.shopping_mall_order_itemsUpdateInput = {
    ...(props.body.line_item_status !== undefined && {
      line_item_status: props.body.line_item_status,
    }),
    ...(props.body.quantity !== undefined && { quantity: props.body.quantity }),
    ...(props.body.seller_price_at_purchase !== undefined && {
      seller_price_at_purchase: props.body.seller_price_at_purchase,
    }),
    ...(props.body.shopping_mall_shipment_id !== undefined && {
      shopping_mall_shipment_id: requestedShipmentId,
    }),
  };
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_order_items.update({
      where: { id: props.orderItemId },
      data,
    });
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.orderItemId },
      ...ShoppingMallOrderItemTransformer.select(),
    });
  return await ShoppingMallOrderItemTransformer.transform(updated);
}
