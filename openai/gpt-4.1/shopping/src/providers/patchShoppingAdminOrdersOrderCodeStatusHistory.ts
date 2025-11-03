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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingAdminOrdersOrderCodeStatusHistory(props: {
  admin: AdminPayload;
  orderCode: string;
  body: IShoppingOrderStatusHistory.IRequest;
}): Promise<IPageIShoppingOrderStatusHistory> {
  // 1. Find the order by order_code (guaranteed unique)
  const order = await MyGlobal.prisma.shopping_orders.findUnique({
    where: { order_code: props.orderCode },
    select: { id: true },
  });
  if (order === null) {
    throw new HttpException("Order not found", 404);
  }

  // 2. Setup paging, sorting, and filters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;

  const where: Record<string, any> = {
    shopping_order_id: order.id,
    ...(props.body.from_status ? { from_status: props.body.from_status } : {}),
    ...(props.body.to_status ? { to_status: props.body.to_status } : {}),
    ...(props.body.actor ? { triggered_by: props.body.actor } : {}),
    ...(props.body.start_date || props.body.end_date
      ? {
          occurred_at: {
            ...(props.body.start_date ? { gte: props.body.start_date } : {}),
            ...(props.body.end_date ? { lte: props.body.end_date } : {}),
          },
        }
      : {}),
    ...(props.body.search
      ? {
          OR: [
            { event_note: { contains: props.body.search } },
            { triggered_by: { contains: props.body.search } },
          ],
        }
      : {}),
  };

  // Allowed sort fields
  const allowedSortFields = [
    "occurred_at",
    "from_status",
    "to_status",
    "triggered_by",
  ];
  let sortBy = props.body.sort_by ?? "occurred_at";
  if (!allowedSortFields.includes(sortBy)) {
    sortBy = "occurred_at";
  }
  const sortOrder = props.body.sort_order === "asc" ? "asc" : "desc";

  // 4. Query count and paginated data
  const [total, records] = await Promise.all([
    MyGlobal.prisma.shopping_order_status_histories.count({ where }),
    MyGlobal.prisma.shopping_order_status_histories.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / (limit || 1)),
    },
    data: records.map((item) => ({
      id: item.id,
      shopping_order_id: item.shopping_order_id,
      shopping_order_split_id: item.shopping_order_split_id ?? undefined,
      from_status: item.from_status,
      to_status: item.to_status,
      triggered_by: item.triggered_by,
      event_note: item.event_note ?? undefined,
      occurred_at: toISOStringSafe(item.occurred_at),
    })),
  };
}
