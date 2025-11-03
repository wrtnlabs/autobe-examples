import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingOrderLine } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderLine";
import { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";
import { IShoppingOrderLineFulfillment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderLineFulfillment";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingCustomerOrdersOrderCodeLinesOrderLineId(props: {
  customer: CustomerPayload;
  orderCode: string;
  orderLineId: string & tags.Format<"uuid">;
}): Promise<IShoppingOrderLine> {
  const { customer, orderCode, orderLineId } = props;
  // Step 1: Find order by orderCode and verify ownership
  const order = await MyGlobal.prisma.shopping_orders.findFirst({
    where: {
      order_code: orderCode,
      deleted_at: null,
    },
    select: {
      id: true,
      shopping_customer_id: true,
    },
  });
  if (!order) {
    throw new HttpException("Order not found", 404);
  }
  if (order.shopping_customer_id !== customer.id) {
    throw new HttpException("Forbidden: You do not own this order", 403);
  }
  // Step 2: Find order line by id within order
  const orderLine = await MyGlobal.prisma.shopping_order_lines.findFirst({
    where: {
      id: orderLineId,
      shopping_order_id: order.id,
    },
    select: {
      id: true,
      shopping_sku_id: true,
      quantity: true,
      unit_price: true,
      status: true,
      shopping_seller_id: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (!orderLine) {
    throw new HttpException("Order line not found", 404);
  }
  // Step 3: Fetch SKU summary
  const sku = await MyGlobal.prisma.shopping_skus.findUnique({
    where: { id: orderLine.shopping_sku_id },
    select: {
      id: true,
      sku_code: true,
      price: true,
      is_active: true,
      status: true,
    },
  });
  if (!sku) {
    throw new HttpException("Sku not found", 500);
  }
  // Step 4: Fetch seller summary
  const seller = await MyGlobal.prisma.shopping_sellers.findUnique({
    where: { id: orderLine.shopping_seller_id },
    select: {
      id: true,
      display_name: true,
      status: true,
    },
  });
  if (!seller) {
    throw new HttpException("Seller not found", 500);
  }
  // Step 5: Fetch fulfillments for this order line, sorted by fulfilled_at
  const fulfillmentsRaw =
    await MyGlobal.prisma.shopping_order_fulfillments.findMany({
      where: { shopping_order_line_id: orderLine.id },
      select: {
        id: true,
        fulfillment_code: true,
        quantity_fulfilled: true,
        status: true,
        fulfilled_at: true,
        shopping_seller_address_id: true,
      },
      orderBy: { fulfilled_at: "asc" },
    });
  const fulfillments = fulfillmentsRaw.length
    ? fulfillmentsRaw.map((f) => ({
        id: f.id,
        fulfillment_code: f.fulfillment_code,
        quantity_fulfilled: f.quantity_fulfilled,
        status: f.status,
        fulfilled_at: toISOStringSafe(f.fulfilled_at),
        seller_address_id: f.shopping_seller_address_id,
      }))
    : undefined;
  return {
    id: orderLine.id,
    sku: {
      id: sku.id,
      sku_code: sku.sku_code,
      price: sku.price,
      is_active: sku.is_active,
      status: sku.status,
    },
    quantity: orderLine.quantity,
    unit_price: orderLine.unit_price,
    status: orderLine.status,
    seller: {
      id: seller.id,
      display_name: seller.display_name,
      status: seller.status,
    },
    fulfillments,
    created_at: toISOStringSafe(orderLine.created_at),
    updated_at: toISOStringSafe(orderLine.updated_at),
    deleted_at: orderLine.deleted_at
      ? toISOStringSafe(orderLine.deleted_at)
      : undefined,
  };
}
