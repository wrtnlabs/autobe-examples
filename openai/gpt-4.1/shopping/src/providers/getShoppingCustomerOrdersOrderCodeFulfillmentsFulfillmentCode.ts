import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingOrderFulfillment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderFulfillment";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingCustomerOrdersOrderCodeFulfillmentsFulfillmentCode(props: {
  customer: CustomerPayload;
  orderCode: string;
  fulfillmentCode: string;
}): Promise<IShoppingOrderFulfillment> {
  // 1. Find the order belonging to the customer (ownership check)
  const order = await MyGlobal.prisma.shopping_orders.findFirst({
    where: {
      order_code: props.orderCode,
      shopping_customer_id: props.customer.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!order) {
    throw new HttpException("Order not found", 404);
  }

  // 2. Find fulfillment by fulfillment code
  const fulfillment =
    await MyGlobal.prisma.shopping_order_fulfillments.findFirst({
      where: { fulfillment_code: props.fulfillmentCode },
    });
  if (!fulfillment) {
    throw new HttpException("Fulfillment not found", 404);
  }

  // 3. Find the order line for the fulfillment (to confirm it belongs to this order)
  const orderLine = await MyGlobal.prisma.shopping_order_lines.findFirst({
    where: {
      id: fulfillment.shopping_order_line_id,
      shopping_order_id: order.id,
    },
    select: { id: true },
  });
  if (!orderLine) {
    throw new HttpException("Fulfillment does not belong to your order", 404);
  }

  return {
    id: fulfillment.id,
    shopping_order_line_id: fulfillment.shopping_order_line_id,
    shopping_seller_id: fulfillment.shopping_seller_id,
    shopping_seller_address_id: fulfillment.shopping_seller_address_id,
    fulfillment_code: fulfillment.fulfillment_code,
    quantity_fulfilled: fulfillment.quantity_fulfilled,
    fulfilled_at: toISOStringSafe(fulfillment.fulfilled_at),
    status: fulfillment.status,
    note: fulfillment.note ?? undefined,
    created_at: toISOStringSafe(fulfillment.created_at),
    updated_at: toISOStringSafe(fulfillment.updated_at),
  };
}
