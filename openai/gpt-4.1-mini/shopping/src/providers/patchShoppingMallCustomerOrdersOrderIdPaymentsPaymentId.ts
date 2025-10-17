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

export async function patchShoppingMallCustomerOrdersOrderIdPaymentsPaymentId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  paymentId: string & tags.Format<"uuid">;
  body: IShoppingMallPayment.IUpdate;
}): Promise<IShoppingMallPayment> {
  const { customer, orderId, paymentId, body } = props;

  // Verify payment exists and belongs to order
  const payment =
    await MyGlobal.prisma.shopping_mall_payments.findUniqueOrThrow({
      where: { id: paymentId },
    });

  if (payment.shopping_mall_order_id !== orderId) {
    throw new HttpException("Payment record not found for this order", 404);
  }

  // Verify order belongs to customer
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: orderId },
  });

  if (!order || order.shopping_mall_customer_id !== customer.id) {
    throw new HttpException(
      "Unauthorized to update payment on this order",
      403,
    );
  }

  // Update payment
  const updated = await MyGlobal.prisma.shopping_mall_payments.update({
    where: { id: paymentId },
    data: {
      payment_amount: body.payment_amount,
      payment_method: body.payment_method,
      payment_status: body.payment_status,
      // Only update transaction_id if present
      ...(body.transaction_id !== undefined && {
        transaction_id: body.transaction_id,
      }),
      // Handle confirmed_at nullable update
      confirmed_at:
        body.confirmed_at === undefined
          ? undefined
          : body.confirmed_at === null
            ? null
            : body.confirmed_at,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    shopping_mall_order_id: updated.shopping_mall_order_id,
    payment_amount: updated.payment_amount,
    payment_method: updated.payment_method,
    payment_status: updated.payment_status,
    transaction_id: updated.transaction_id ?? null,
    confirmed_at: updated.confirmed_at
      ? toISOStringSafe(updated.confirmed_at)
      : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
