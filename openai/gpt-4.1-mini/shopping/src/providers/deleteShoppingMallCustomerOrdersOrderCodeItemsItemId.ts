import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerOrdersOrderCodeItemsItemId(props: {
  customer: CustomerPayload;
  orderCode: string;
  itemId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { customer, orderCode, itemId } = props;

  // Find the order by orderCode with customer id
  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { order_code: orderCode },
    select: {
      id: true,
      shopping_mall_customer_id: true,
    },
  });

  // Check customer ownership
  if (order.shopping_mall_customer_id !== customer.id) {
    throw new HttpException(
      "Forbidden: You can only delete items from your own orders",
      403,
    );
  }

  // Find the order item by id and order id, filtering out soft deleted
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findFirstOrThrow({
      where: {
        id: itemId,
        shopping_mall_order_id: order.id,
        deleted_at: null,
      },
    });

  // Hard delete the order item
  await MyGlobal.prisma.shopping_mall_order_items.delete({
    where: { id: orderItem.id },
  });

  // Sum total_price of remaining order items that are not deleted
  const remainingOrderItems =
    await MyGlobal.prisma.shopping_mall_order_items.findMany({
      where: {
        shopping_mall_order_id: order.id,
        deleted_at: null,
      },
      select: { total_price: true },
    });

  const totalAmount = remainingOrderItems.reduce(
    (sum, item) => sum + item.total_price,
    0,
  );

  // Update order total_amount and updated_at
  await MyGlobal.prisma.shopping_mall_orders.update({
    where: { id: order.id },
    data: {
      total_amount: totalAmount,
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
