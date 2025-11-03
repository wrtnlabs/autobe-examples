import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingOrderFulfillment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderFulfillment";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingSellerOrdersOrderCodeFulfillmentsFulfillmentCode(props: {
  seller: SellerPayload;
  orderCode: string;
  fulfillmentCode: string;
}): Promise<IShoppingOrderFulfillment> {
  const { seller, orderCode, fulfillmentCode } = props;

  // Find the order (by orderCode) and make sure it is not deleted
  const order = await MyGlobal.prisma.shopping_orders.findFirst({
    where: {
      order_code: orderCode,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!order) throw new HttpException("Order not found", 404);

  // Find all order_line IDs that belong to this order and are not deleted
  const orderLines = await MyGlobal.prisma.shopping_order_lines.findMany({
    where: {
      shopping_order_id: order.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  const orderLineIds = orderLines.map((l) => l.id);
  if (orderLineIds.length === 0)
    throw new HttpException("Order has no active line items", 404);

  // Find the fulfillment for this order and seller, not deleted
  const fulfillment =
    await MyGlobal.prisma.shopping_order_fulfillments.findFirst({
      where: {
        fulfillment_code: fulfillmentCode,
        shopping_seller_id: seller.id,
        shopping_order_line_id: { in: orderLineIds },
      },
    });
  if (!fulfillment)
    throw new HttpException("Fulfillment not found or not accessible", 404);

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
