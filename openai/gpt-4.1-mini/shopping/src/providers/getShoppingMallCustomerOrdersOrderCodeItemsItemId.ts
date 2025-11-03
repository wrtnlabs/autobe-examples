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

export async function getShoppingMallCustomerOrdersOrderCodeItemsItemId(props: {
  customer: CustomerPayload;
  orderCode: string;
  itemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderItem> {
  const { customer, orderCode, itemId } = props;

  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { order_code: orderCode },
    select: { id: true, shopping_mall_customer_id: true, deleted_at: true },
  });

  if (order.shopping_mall_customer_id !== customer.id) {
    throw new HttpException("Forbidden: You do not own this order", 403);
  }

  if (order.deleted_at !== null) {
    throw new HttpException("Not Found: Order is deleted", 404);
  }

  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: itemId },
      select: {
        id: true,
        shopping_mall_order_id: true,
        shopping_mall_product_sku_id: true,
        quantity: true,
        unit_price: true,
        total_price: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

  if (orderItem.shopping_mall_order_id !== order.id) {
    throw new HttpException(
      "Not Found: Order item does not belong to given order",
      404,
    );
  }

  return {
    id: orderItem.id,
    shopping_mall_order_id: orderItem.shopping_mall_order_id,
    shopping_mall_product_sku_id: orderItem.shopping_mall_product_sku_id,
    quantity: orderItem.quantity,
    unit_price: orderItem.unit_price,
    total_price: orderItem.total_price,
    created_at: toISOStringSafe(orderItem.created_at),
    updated_at: toISOStringSafe(orderItem.updated_at),
    deleted_at:
      orderItem.deleted_at === null
        ? undefined
        : toISOStringSafe(orderItem.deleted_at),
  };
}
