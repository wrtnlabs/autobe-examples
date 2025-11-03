import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingPaymentAttempt";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingAdminOrdersOrderCodePaymentAttemptsPaymentReference(props: {
  admin: AdminPayload;
  orderCode: string;
  paymentReference: string;
}): Promise<IShoppingPaymentAttempt> {
  // Find the order by orderCode, must not be deleted
  const order = await MyGlobal.prisma.shopping_orders.findFirst({
    where: {
      order_code: props.orderCode,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!order) {
    throw new HttpException("Order not found", 404);
  }
  // Find the payment attempt by paymentReference, order id, not deleted
  const attempt = await MyGlobal.prisma.shopping_payment_attempts.findFirst({
    where: {
      shopping_order_id: order.id,
      payment_reference: props.paymentReference,
    },
  });
  if (!attempt) {
    throw new HttpException("Payment attempt not found", 404);
  }
  return {
    id: attempt.id,
    shopping_order_id: attempt.shopping_order_id,
    payment_reference: attempt.payment_reference ?? null,
    attempt_status: attempt.attempt_status,
    amount: attempt.amount,
    attempted_at: toISOStringSafe(attempt.attempted_at),
    completed_at: attempt.completed_at
      ? toISOStringSafe(attempt.completed_at)
      : null,
  };
}
