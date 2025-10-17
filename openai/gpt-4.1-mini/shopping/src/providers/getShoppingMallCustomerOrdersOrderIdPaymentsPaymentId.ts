import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerOrdersOrderIdPaymentsPaymentId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  paymentId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallPayment> {
  const { customer, orderId, paymentId } = props;

  // Fetch payment record or throw 404
  const payment =
    await MyGlobal.prisma.shopping_mall_payments.findUniqueOrThrow({
      where: { id: paymentId },
    });

  // Verify payment belongs to the given order
  if (payment.shopping_mall_order_id !== orderId) {
    throw new HttpException(
      "Payment record does not belong to the specified order",
      404,
    );
  }

  // Fetch order or throw 404
  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: orderId },
  });

  // Authorization check: customer owns the order
  if (order.shopping_mall_customer_id !== customer.id) {
    throw new HttpException("Unauthorized: You do not own this order", 403);
  }

  // Return payment data with converted date fields
  return {
    id: payment.id,
    shopping_mall_order_id: payment.shopping_mall_order_id,
    payment_amount: payment.payment_amount,
    payment_method: payment.payment_method,
    payment_status: payment.payment_status,
    transaction_id: payment.transaction_id ?? null,
    confirmed_at: payment.confirmed_at
      ? toISOStringSafe(payment.confirmed_at)
      : null,
    created_at: toISOStringSafe(payment.created_at),
    updated_at: toISOStringSafe(payment.updated_at),
  };
}
