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

export async function postShoppingMallCustomerOrdersOrderIdItems(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderItem.ICreate;
}): Promise<IShoppingMallOrderItem> {
  const { customer, orderId, body } = props;

  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: orderId },
  });

  if (order === null) {
    throw new HttpException("Order not found", 404);
  }

  if (order.shopping_mall_customer_id !== customer.id) {
    throw new HttpException("Unauthorized: You do not own this order", 403);
  }

  const sku = await MyGlobal.prisma.shopping_mall_skus.findUnique({
    where: { id: body.shopping_mall_sku_id },
  });

  if (sku === null) {
    throw new HttpException("SKU not found", 404);
  }

  const inventory = await MyGlobal.prisma.shopping_mall_inventory.findUnique({
    where: { shopping_mall_sku_id: body.shopping_mall_sku_id },
  });

  if (inventory === null) {
    throw new HttpException("Inventory record not found for this SKU", 404);
  }

  if (inventory.quantity < body.quantity) {
    throw new HttpException("Insufficient stock quantity", 400);
  }

  if (body.total_price !== body.quantity * body.unit_price) {
    throw new HttpException(
      "Total price must equal quantity multiplied by unit price",
      400,
    );
  }

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.shopping_mall_order_items.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_order_id: orderId,
      shopping_mall_sku_id: body.shopping_mall_sku_id,
      quantity: body.quantity,
      unit_price: body.unit_price,
      total_price: body.total_price,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    shopping_mall_order_id: created.shopping_mall_order_id,
    shopping_mall_sku_id: created.shopping_mall_sku_id,
    quantity: created.quantity,
    unit_price: created.unit_price,
    total_price: created.total_price,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
