import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminOrdersOrderNumberItemsId(props: {
  admin: AdminPayload;
  orderNumber: string;
  id: string & tags.Format<"uuid">;
  body: IShoppingMallOrderItem.IUpdate;
}): Promise<IShoppingMallOrderItem> {
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      order_number: props.orderNumber,
    },
  });

  if (!order) {
    throw new HttpException("Order not found", 404);
  }

  if (!["draft", "pending_payment"].includes(order.status)) {
    throw new HttpException("Order is not in a modifiable state", 400);
  }

  const item = await MyGlobal.prisma.shopping_mall_order_items.findUnique({
    where: {
      id: props.id,
      shopping_mall_order_id: order.id,
    },
  });

  if (!item) {
    throw new HttpException("Order item not found", 404);
  }

  const quantity =
    props.body.quantity !== undefined ? props.body.quantity : item.quantity;
  const unit_price =
    props.body.unit_price !== undefined
      ? props.body.unit_price
      : item.unit_price;

  if (unit_price < 0) {
    throw new HttpException("Unit price cannot be negative", 400);
  }

  const item_total = quantity * unit_price;
  const notes = props.body.notes ?? item.notes;

  const updatedItem = await MyGlobal.prisma.$transaction(async (prisma) => {
    // Update the order item
    const updatedItem = await prisma.shopping_mall_order_items.update({
      where: { id: props.id },
      data: {
        quantity,
        unit_price,
        item_total,
        notes:
          notes === undefined || notes === null
            ? null
            : (notes as string | null),
      },
    });

    // Update order subtotal and total_amount
    // Recalculate lines: sum item_total for all items
    const orderItems = await prisma.shopping_mall_order_items.findMany({
      where: { shopping_mall_order_id: order.id },
    });

    const subtotal = orderItems.reduce((sum, i) => sum + i.item_total, 0);
    const tax_amount = order.tax_amount;
    const shipping_fee = order.shipping_fee;
    const discount_amount = order.discount_amount;
    const total_amount = subtotal + tax_amount + shipping_fee - discount_amount;

    await prisma.shopping_mall_orders.update({
      where: { id: order.id },
      data: {
        subtotal,
        total_amount,
      },
    });

    return updatedItem;
  });

  return {
    id: updatedItem.id,
    shopping_mall_order_id: updatedItem.shopping_mall_order_id,
    shopping_mall_product_variant_id: typia.assert<
      string & tags.Format<"uuid">
    >(updatedItem.shopping_mall_product_variant_id),
    quantity: updatedItem.quantity,
    unit_price: updatedItem.unit_price,
    item_total: updatedItem.item_total,
  };
}
