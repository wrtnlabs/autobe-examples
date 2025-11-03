import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderStatusHistory";
import { IPageIShoppingOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingOrderStatusHistory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingCustomerOrdersOrderCodeStatusHistory(props: {
  customer: CustomerPayload;
  orderCode: string;
  body: IShoppingOrderStatusHistory.IRequest;
}): Promise<IPageIShoppingOrderStatusHistory> {
  const { customer, orderCode, body } = props;
  // Step 1: Find the order by orderCode, ensure customer is owner
  const order = await MyGlobal.prisma.shopping_orders.findUnique({
    where: { order_code: orderCode },
    select: { id: true, shopping_customer_id: true, deleted_at: true },
  });
  if (!order) throw new HttpException("Order not found", 404);
  if (order.deleted_at !== null)
    throw new HttpException("Order has been deleted", 404);
  if (order.shopping_customer_id !== customer.id) {
    throw new HttpException("Forbidden: Not your order", 403);
  }

  // Step 2: Prepare filtering conditions
  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 20);

  // Where clause for shopping_order_status_histories
  const where: Record<string, any> = {
    shopping_order_id: order.id,
    ...(body.from_status !== undefined && { from_status: body.from_status }),
    ...(body.to_status !== undefined && { to_status: body.to_status }),
    ...(body.actor !== undefined && { triggered_by: body.actor }),
    ...(body.start_date !== undefined && {
      occurred_at: { gte: body.start_date },
    }),
    ...(body.end_date !== undefined && { occurred_at: { lte: body.end_date } }),
  };

  // Full-text search on event_note and triggered_by (actor)
  if (body.search !== undefined && body.search !== "") {
    where.OR = [
      { event_note: { contains: body.search } },
      { triggered_by: { contains: body.search } },
    ];
  }

  // Sort and order
  let orderBy: any = { occurred_at: "desc" };
  if (body.sort_by) {
    const orderKey = body.sort_by;
    orderBy = { [orderKey]: body.sort_order === "asc" ? "asc" : "desc" };
  } else if (body.sort_order === "asc") {
    orderBy = { occurred_at: "asc" };
  }

  // Step 3: Paginate and fetch
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_order_status_histories.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.shopping_order_status_histories.count({ where }),
  ]);

  // Step 4: Map to DTO
  const data = rows.map((row) => ({
    id: row.id,
    shopping_order_id: row.shopping_order_id,
    shopping_order_split_id:
      row.shopping_order_split_id === null
        ? undefined
        : row.shopping_order_split_id,
    from_status: row.from_status,
    to_status: row.to_status,
    triggered_by: row.triggered_by,
    event_note: row.event_note === null ? undefined : row.event_note,
    occurred_at: toISOStringSafe(row.occurred_at),
  }));

  // Step 5: Pagination response
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
