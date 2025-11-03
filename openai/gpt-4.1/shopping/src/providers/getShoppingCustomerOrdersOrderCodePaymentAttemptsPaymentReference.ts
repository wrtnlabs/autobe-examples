import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingPaymentAttempt";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingCustomerOrdersOrderCodePaymentAttemptsPaymentReference(props: {
  customer: CustomerPayload;
  orderCode: string;
  paymentReference: string;
}): Promise<IShoppingPaymentAttempt> {
  const { customer, orderCode, paymentReference } = props;
  // 1. Find the order by orderCode and check ownership
  const order = await MyGlobal.prisma.shopping_orders.findUnique({
    where: { order_code: orderCode },
    select: { id: true, shopping_customer_id: true, deleted_at: true },
  });
  if (!order || order.deleted_at !== null) {
    throw new HttpException("Order not found", 404);
  }
  if (order.shopping_customer_id !== customer.id) {
    throw new HttpException(
      "Forbidden: You do not have access to this order's payment attempts.",
      403,
    );
  }
  // 2. Lookup the payment attempt by shopping_order_id and payment_reference
  const paymentAttempt =
    await MyGlobal.prisma.shopping_payment_attempts.findFirst({
      where: {
        shopping_order_id: order.id,
        payment_reference: paymentReference,
      },
    });
  if (!paymentAttempt) {
    throw new HttpException("Payment attempt not found", 404);
  }

  return {
    id: paymentAttempt.id,
    shopping_order_id: paymentAttempt.shopping_order_id,
    payment_reference: paymentAttempt.payment_reference ?? undefined,
    attempt_status: paymentAttempt.attempt_status,
    amount: paymentAttempt.amount,
    attempted_at: toISOStringSafe(paymentAttempt.attempted_at),
    completed_at:
      paymentAttempt.completed_at !== null &&
      paymentAttempt.completed_at !== undefined
        ? toISOStringSafe(paymentAttempt.completed_at)
        : paymentAttempt.completed_at,
  };
}
