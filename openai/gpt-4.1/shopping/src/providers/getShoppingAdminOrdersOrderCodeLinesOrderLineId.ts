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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingAdminOrdersOrderCodeLinesOrderLineId(props: {
  admin: AdminPayload;
  orderCode: string;
  orderLineId: string & tags.Format<"uuid">;
}): Promise<IShoppingOrderLine> {
  // 1. Lookup order by orderCode
  const order = await MyGlobal.prisma.shopping_orders.findUnique({
    where: { order_code: props.orderCode },
    select: { id: true },
  });
  if (!order) throw new HttpException("Order not found", 404);

  // 2. Lookup order line without relations
  const orderLine = await MyGlobal.prisma.shopping_order_lines.findUnique({
    where: { id: props.orderLineId },
  });
  if (!orderLine || orderLine.shopping_order_id !== order.id) {
    throw new HttpException("Order line not found for this order", 404);
  }

  // 3. Fetch SKU info
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
  if (!sku) throw new HttpException("SKU not found for order line", 404);

  // 4. Fetch Seller info
  const seller = await MyGlobal.prisma.shopping_sellers.findUnique({
    where: { id: orderLine.shopping_seller_id },
    select: {
      id: true,
      display_name: true,
      status: true,
    },
  });
  if (!seller) throw new HttpException("Seller not found for order line", 404);

  // 5. Fetch fulfillments
  const fulfillments =
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

  return {
    id: orderLine.id as string & tags.Format<"uuid">,
    sku: {
      id: sku.id as string & tags.Format<"uuid">,
      sku_code: sku.sku_code,
      price: sku.price,
      is_active: sku.is_active,
      status: sku.status,
    },
    quantity: orderLine.quantity as number &
      tags.Type<"int32"> &
      tags.Minimum<1>,
    unit_price: orderLine.unit_price,
    status: orderLine.status,
    seller: {
      id: seller.id as string & tags.Format<"uuid">,
      display_name: seller.display_name,
      status: seller.status,
    },
    fulfillments:
      fulfillments.length > 0
        ? fulfillments.map(
            (f): IShoppingOrderLineFulfillment.ISummary => ({
              id: f.id as string & tags.Format<"uuid">,
              fulfillment_code: f.fulfillment_code,
              quantity_fulfilled: f.quantity_fulfilled as number &
                tags.Type<"int32">,
              status: f.status,
              fulfilled_at: toISOStringSafe(f.fulfilled_at),
              seller_address_id: f.shopping_seller_address_id as string &
                tags.Format<"uuid">,
            }),
          )
        : undefined,
    created_at: toISOStringSafe(orderLine.created_at),
    updated_at: toISOStringSafe(orderLine.updated_at),
    deleted_at:
      orderLine.deleted_at !== null && orderLine.deleted_at !== undefined
        ? toISOStringSafe(orderLine.deleted_at)
        : undefined,
  };
}
