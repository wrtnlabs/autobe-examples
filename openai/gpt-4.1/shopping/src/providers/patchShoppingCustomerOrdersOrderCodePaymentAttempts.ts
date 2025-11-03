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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingCustomerOrdersOrderCodePaymentAttempts(props: {
  customer: CustomerPayload;
  orderCode: string;
  body: IShoppingPaymentAttempt.IRequest;
}): Promise<IPageIShoppingPaymentAttempt> {
  const { customer, orderCode, body } = props;

  // Step 1: Find the order by order_code, must belong to customer and not deleted
  const order = await MyGlobal.prisma.shopping_orders.findFirst({
    where: {
      order_code: orderCode,
      shopping_customer_id: customer.id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (!order) {
    throw new HttpException("Order not found or not authorized", 404);
  }

  // Step 2: Build filtering conditions
  const filters: Record<string, any> = {
    shopping_order_id: order.id,
  };
  if (body.status !== undefined) {
    filters.attempt_status = body.status;
  }
  if (body.payment_reference !== undefined) {
    filters.payment_reference = body.payment_reference;
  }
  if (body.from_date !== undefined) {
    filters.attempted_at = { ...filters.attempted_at, gte: body.from_date };
  }
  if (body.to_date !== undefined) {
    filters.attempted_at = { ...filters.attempted_at, lte: body.to_date };
  }

  // Step 3: Sorting
  const sortField =
    body.sort_by === "completed_at" ? "completed_at" : "attempted_at";
  const sortOrder = body.sort_direction === "asc" ? "asc" : "desc";

  // Step 4: Pagination
  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 20);
  const skip = (page - 1) * limit;

  // Step 5: Query total count
  const total = await MyGlobal.prisma.shopping_payment_attempts.count({
    where: filters,
  });

  // Step 6: Query paged results
  const paymentAttempts =
    await MyGlobal.prisma.shopping_payment_attempts.findMany({
      where: filters,
      orderBy: {
        [sortField]: sortOrder,
      },
      skip,
      take: limit,
      select: {
        id: true,
        shopping_order_id: true,
        payment_reference: true,
        attempt_status: true,
        amount: true,
        attempted_at: true,
        completed_at: true,
      },
    });

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: paymentAttempts.map((a) => ({
      id: a.id,
      shopping_order_id: a.shopping_order_id,
      payment_reference: a.payment_reference ?? null,
      attempt_status: a.attempt_status,
      amount: a.amount,
      attempted_at: toISOStringSafe(a.attempted_at),
      completed_at: a.completed_at ? toISOStringSafe(a.completed_at) : null,
    })),
  };
}
