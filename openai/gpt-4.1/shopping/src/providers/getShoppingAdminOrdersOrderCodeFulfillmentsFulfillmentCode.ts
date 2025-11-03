import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingOrderFulfillment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderFulfillment";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingAdminOrdersOrderCodeFulfillmentsFulfillmentCode(props: {
  admin: AdminPayload;
  orderCode: string;
  fulfillmentCode: string;
}): Promise<IShoppingOrderFulfillment> {
  // Step 1: Find order by code, ensure not soft-deleted
  const order = await MyGlobal.prisma.shopping_orders.findFirst({
    where: {
      order_code: props.orderCode,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!order) throw new HttpException("Order not found", 404);

  // Step 2: Find order lines for the order
  const orderLines = await MyGlobal.prisma.shopping_order_lines.findMany({
    where: { shopping_order_id: order.id },
    select: { id: true },
  });
  const orderLineIds = orderLines.map((l) => l.id);

  if (orderLineIds.length === 0)
    throw new HttpException("No fulfillments for this order", 404);

  // Step 3: Find the fulfillment for the order by fulfillment_code and order_line_id
  const fulfillment =
    await MyGlobal.prisma.shopping_order_fulfillments.findFirst({
      where: {
        fulfillment_code: props.fulfillmentCode,
        shopping_order_line_id: { in: orderLineIds },
      },
      select: {
        id: true,
        shopping_order_line_id: true,
        shopping_seller_id: true,
        shopping_seller_address_id: true,
        fulfillment_code: true,
        quantity_fulfilled: true,
        fulfilled_at: true,
        status: true,
        note: true,
        created_at: true,
        updated_at: true,
      },
    });
  if (!fulfillment)
    throw new HttpException("Fulfillment not found for this order", 404);

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
