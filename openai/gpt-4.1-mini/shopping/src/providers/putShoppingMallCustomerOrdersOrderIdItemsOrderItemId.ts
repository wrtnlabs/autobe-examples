import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerOrdersOrderIdItemsOrderItemId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  orderItemId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderItem.IUpdate;
}): Promise<IShoppingMallOrderItem> {
  const { customer, orderId, orderItemId, body } = props;

  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: orderId },
    select: {
      id: true,
      shopping_mall_customer_id: true,
    },
  });

  if (order.shopping_mall_customer_id !== customer.id) {
    throw new HttpException("Forbidden: Not the owner of the order", 403);
  }

  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: orderItemId },
      select: {
        id: true,
        shopping_mall_order_id: true,
        shopping_mall_sku_id: true,
        quantity: true,
        unit_price: true,
        total_price: true,
        created_at: true,
        updated_at: true,
      },
    });

  if (orderItem.shopping_mall_order_id !== orderId) {
    throw new HttpException(
      "Order item does not belong to the specified order",
      400,
    );
  }

  const sku = await MyGlobal.prisma.shopping_mall_skus.findUniqueOrThrow({
    where: { id: orderItem.shopping_mall_sku_id },
    select: { id: true },
  });

  const inventory = await MyGlobal.prisma.shopping_mall_inventory.findUnique({
    where: { shopping_mall_sku_id: sku.id },
    select: { quantity: true },
  });

  const requestedQuantity = body.quantity ?? orderItem.quantity;

  if (inventory !== null && requestedQuantity > inventory.quantity) {
    throw new HttpException(
      "Requested quantity exceeds available inventory",
      400,
    );
  }

  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.shopping_mall_order_items.update({
    where: { id: orderItemId },
    data: {
      quantity: body.quantity ?? undefined,
      unit_price: body.unit_price ?? undefined,
      total_price: body.total_price ?? undefined,
      updated_at: now,
    },
    select: {
      id: true,
      shopping_mall_order_id: true,
      shopping_mall_sku_id: true,
      quantity: true,
      unit_price: true,
      total_price: true,
      created_at: true,
      updated_at: true,
    },
  });

  return {
    id: updated.id,
    shopping_mall_order_id: updated.shopping_mall_order_id,
    shopping_mall_sku_id: updated.shopping_mall_sku_id,
    quantity: updated.quantity,
    unit_price: updated.unit_price,
    total_price: updated.total_price,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
