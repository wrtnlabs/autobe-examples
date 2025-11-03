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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingSellerOrdersOrderCodePaymentAttempts(props: {
  seller: SellerPayload;
  orderCode: string;
  body: IShoppingPaymentAttempt.IRequest;
}): Promise<IPageIShoppingPaymentAttempt> {
  const { seller, orderCode, body } = props;
  // 1. Find order by code, ensure seller owns at least one order line in this order
  const order = await MyGlobal.prisma.shopping_orders.findFirst({
    where: {
      order_code: orderCode,
      deleted_at: null,
    },
    select: {
      id: true,
      shopping_order_lines: {
        select: {
          shopping_seller_id: true,
        },
      },
    },
  });
  if (!order) {
    throw new HttpException("Order not found", 404);
  }
  const hasSellerOrderLine = order.shopping_order_lines.some(
    (line) => line.shopping_seller_id === seller.id,
  );
  if (!hasSellerOrderLine) {
    throw new HttpException(
      "Forbidden: Seller does not have access to this order",
      403,
    );
  }
  // 2. Build filter for payment attempts
  const where: Record<string, unknown> = {
    shopping_order_id: order.id,
    ...(body.status !== undefined && { attempt_status: body.status }),
    ...(body.payment_reference !== undefined && {
      payment_reference: body.payment_reference,
    }),
    ...(body.from_date !== undefined || body.to_date !== undefined
      ? {
          attempted_at: {
            ...(body.from_date !== undefined && { gte: body.from_date }),
            ...(body.to_date !== undefined && { lte: body.to_date }),
          },
        }
      : {}),
  };
  // 3. Pagination parameters
  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 20);
  const skip = (page - 1) * limit;
  // 4. Sorting
  const orderBy =
    body.sort_by === "completed_at"
      ? { completed_at: body.sort_direction ?? "desc" }
      : { attempted_at: body.sort_direction ?? "desc" };
  // 5. Query payment attempts and count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_payment_attempts.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_payment_attempts.count({ where }),
  ]);
  // 6. Map payment_attempts to output format
  const data = rows.map((row) => ({
    id: row.id,
    shopping_order_id: row.shopping_order_id,
    payment_reference:
      row.payment_reference !== undefined ? row.payment_reference : null,
    attempt_status: row.attempt_status,
    amount: row.amount,
    attempted_at: toISOStringSafe(row.attempted_at),
    completed_at:
      row.completed_at !== null && row.completed_at !== undefined
        ? toISOStringSafe(row.completed_at)
        : null,
  }));
  return {
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data,
  };
}
