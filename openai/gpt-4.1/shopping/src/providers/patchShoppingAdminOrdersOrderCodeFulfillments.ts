import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingOrderFulfillment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderFulfillment";
import { IPageIShoppingOrderFulfillment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingOrderFulfillment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingAdminOrdersOrderCodeFulfillments(props: {
  admin: AdminPayload;
  orderCode: string;
  body: IShoppingOrderFulfillment.IRequest;
}): Promise<IPageIShoppingOrderFulfillment> {
  // 1. Find the order by orderCode
  const order = await MyGlobal.prisma.shopping_orders.findFirst({
    where: {
      order_code: props.orderCode,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (!order) {
    throw new HttpException("Order not found", 404);
  }
  // 2. Find all order line IDs for this order
  const lines = await MyGlobal.prisma.shopping_order_lines.findMany({
    where: {
      shopping_order_id: order.id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  const orderLineIds = lines.map((l) => l.id);
  if (orderLineIds.length === 0) {
    return {
      pagination: {
        current: Number(props.body.page ?? 1),
        limit: Number(props.body.limit ?? 20),
        records: 0,
        pages: 0,
      },
      data: [],
    };
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const whereCond: Record<string, any> = {
    shopping_order_line_id: { in: orderLineIds },
  };
  if (props.body.status !== undefined && props.body.status !== null) {
    whereCond.status = props.body.status;
  }
  if (props.body.from !== undefined && props.body.from !== null) {
    whereCond.fulfilled_at = {
      ...(whereCond.fulfilled_at || {}),
      gte: props.body.from,
    };
  }
  if (props.body.to !== undefined && props.body.to !== null) {
    whereCond.fulfilled_at = {
      ...(whereCond.fulfilled_at || {}),
      lte: props.body.to,
    };
  }

  const [fulfillmentRows, total] = await Promise.all([
    MyGlobal.prisma.shopping_order_fulfillments.findMany({
      where: whereCond,
      orderBy: { fulfilled_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_order_fulfillments.count({
      where: whereCond,
    }),
  ]);

  const data: IShoppingOrderFulfillment[] = fulfillmentRows.map((row) => ({
    id: row.id,
    shopping_order_line_id: row.shopping_order_line_id,
    shopping_seller_id: row.shopping_seller_id,
    shopping_seller_address_id: row.shopping_seller_address_id,
    fulfillment_code: row.fulfillment_code,
    quantity_fulfilled: row.quantity_fulfilled,
    fulfilled_at: toISOStringSafe(row.fulfilled_at),
    status: row.status,
    note: row.note ?? undefined,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
  }));
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: total > 0 ? Math.ceil(total / limit) : 0,
    },
    data,
  };
}
