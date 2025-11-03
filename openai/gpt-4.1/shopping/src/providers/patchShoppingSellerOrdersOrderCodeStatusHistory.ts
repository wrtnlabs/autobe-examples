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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingSellerOrdersOrderCodeStatusHistory(props: {
  seller: SellerPayload;
  orderCode: string;
  body: IShoppingOrderStatusHistory.IRequest;
}): Promise<IPageIShoppingOrderStatusHistory> {
  const { seller, orderCode, body } = props;

  // 1. Find the order by orderCode (must exist, must not be deleted)
  const order = await MyGlobal.prisma.shopping_orders.findFirst({
    where: { order_code: orderCode, deleted_at: null },
    select: { id: true },
  });
  if (!order) {
    throw new HttpException("Order not found", 404);
  }

  // 2. Confirm seller access: must have at least one line in this order
  const sellerHasLine = await MyGlobal.prisma.shopping_order_lines.findFirst({
    where: {
      shopping_order_id: order.id,
      shopping_seller_id: seller.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!sellerHasLine) {
    throw new HttpException(
      "Forbidden: You do not have permission to view this order's status history",
      403,
    );
  }

  // 3. Pagination and filter preparation
  const page = body.page ?? 1;
  const limit = Math.min(body.limit ?? 20, 100);
  const skip = (page - 1) * limit;

  // Build filters
  const statusWhere: Record<string, any> = {
    shopping_order_id: order.id,
    ...(body.from_status !== undefined && { from_status: body.from_status }),
    ...(body.to_status !== undefined && { to_status: body.to_status }),
    ...(body.actor !== undefined && { triggered_by: body.actor }),
    ...(body.start_date !== undefined &&
      body.start_date !== null && {
        occurred_at: { gte: body.start_date },
      }),
    ...(body.end_date !== undefined &&
      body.end_date !== null && {
        occurred_at: {
          ...(body.start_date !== undefined &&
            body.start_date !== null && { gte: body.start_date }),
          lte: body.end_date,
        },
      }),
    ...(body.search !== undefined &&
      body.search !== null && {
        OR: [
          { event_note: { contains: body.search } },
          { triggered_by: { contains: body.search } },
        ],
      }),
  };

  // Prisma 'where' clause: handle date range collision (gte/lte) in occurred_at
  if (
    body.start_date !== undefined &&
    body.start_date !== null &&
    body.end_date !== undefined &&
    body.end_date !== null
  ) {
    statusWhere.occurred_at = {
      gte: body.start_date,
      lte: body.end_date,
    };
  }

  // 4. Sort
  const allowedSortFields = [
    "occurred_at",
    "from_status",
    "to_status",
    "triggered_by",
  ];
  const sortBy = allowedSortFields.includes(body.sort_by ?? "")
    ? body.sort_by!
    : "occurred_at";
  const sortOrder = body.sort_order === "asc" ? "asc" : "desc";

  // 5. Query status history and total for pagination
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_order_status_histories.findMany({
      where: statusWhere,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_order_status_histories.count({
      where: statusWhere,
    }),
  ]);

  // 6. Map to API DTO
  const data = rows.map((row) => ({
    id: row.id,
    shopping_order_id: row.shopping_order_id,
    shopping_order_split_id: row.shopping_order_split_id ?? undefined,
    from_status: row.from_status,
    to_status: row.to_status,
    triggered_by: row.triggered_by,
    event_note: row.event_note ?? undefined,
    occurred_at: toISOStringSafe(row.occurred_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
