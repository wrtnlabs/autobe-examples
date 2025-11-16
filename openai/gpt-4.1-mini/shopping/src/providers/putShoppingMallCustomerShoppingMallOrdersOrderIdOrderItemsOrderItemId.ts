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

export async function putShoppingMallCustomerShoppingMallOrdersOrderIdOrderItemsOrderItemId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  orderItemId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderItem.IUpdate;
}): Promise<IShoppingMallOrderItem> {
  // Verify the order item exists and belongs to the specified order
  const existingOrderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUnique({
      where: { id: props.orderItemId },
      select: {
        id: true,
        shopping_mall_order_id: true,
        shopping_mall_product_sku_id: true,
        quantity: true,
        unit_price: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
    });

  if (!existingOrderItem) {
    throw new HttpException("Order item not found", 404);
  }

  // Verify that the order item is part of the given order
  if (existingOrderItem.shopping_mall_order_id !== props.orderId) {
    throw new HttpException(
      "Order item does not belong to the specified order",
      400,
    );
  }

  // Verify that the order belongs to the customer
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: props.orderId },
    select: { id: true, shopping_mall_customer_id: true },
  });

  if (!order) {
    throw new HttpException("Order not found", 404);
  }

  if (order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }

  // Perform the update operation with partial update fields
  const updated = await MyGlobal.prisma.shopping_mall_order_items.update({
    where: { id: props.orderItemId },
    data: {
      ...props.body,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    shopping_mall_order_id: updated.shopping_mall_order_id,
    shopping_mall_product_sku_id: updated.shopping_mall_product_sku_id,
    quantity: updated.quantity,
    unit_price: updated.unit_price,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
