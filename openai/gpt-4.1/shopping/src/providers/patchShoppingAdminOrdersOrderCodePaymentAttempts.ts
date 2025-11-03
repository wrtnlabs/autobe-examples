import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingPaymentAttempt";
import { IPageIShoppingPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingPaymentAttempt";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingAdminOrdersOrderCodePaymentAttempts(props: {
  admin: AdminPayload;
  orderCode: string;
  body: IShoppingPaymentAttempt.IRequest;
}): Promise<IPageIShoppingPaymentAttempt> {
  // 1. Find the order by orderCode, ensure not soft-deleted
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
  // extract paging/sorting/filter options
  const page = props.body.page;
  const limit = props.body.limit;
  // Build where condition (inline, functional/immutable)
  const where = {
    shopping_order_id: order.id,
    ...(props.body.status !== undefined && {
      attempt_status: props.body.status,
    }),
    ...(props.body.payment_reference !== undefined && {
      payment_reference: props.body.payment_reference,
    }),
    ...(props.body.from_date !== undefined && {
      attempted_at: {
        gte: props.body.from_date,
        ...(props.body.to_date !== undefined && { lte: props.body.to_date }),
      },
    }),
    // If only to_date is provided, add attempted_at.lte
    ...(props.body.from_date === undefined &&
      props.body.to_date !== undefined && {
        attempted_at: { lte: props.body.to_date },
      }),
  };
  // Sort field/direction
  const allowedSortFields = ["attempted_at", "completed_at"];
  const sortBy = allowedSortFields.includes(props.body.sort_by ?? "")
    ? props.body.sort_by
    : "attempted_at";
  const sortDirection = props.body.sort_direction === "asc" ? "asc" : "desc";
  // Query for paged results and total (no intermediate variables in data)
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_payment_attempts.findMany({
      where,
      orderBy: { [sortBy!]: sortDirection },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.shopping_payment_attempts.count({ where }),
  ]);
  // Map each payment attempt to DTO format
  const data = rows.map((row) => ({
    id: row.id,
    shopping_order_id: row.shopping_order_id,
    payment_reference:
      row.payment_reference === null ? undefined : row.payment_reference,
    attempt_status: row.attempt_status,
    amount: row.amount,
    attempted_at: toISOStringSafe(row.attempted_at),
    completed_at: row.completed_at ? toISOStringSafe(row.completed_at) : null,
  }));
  // Pagination structure
  const pages = Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    },
    data,
  };
}
