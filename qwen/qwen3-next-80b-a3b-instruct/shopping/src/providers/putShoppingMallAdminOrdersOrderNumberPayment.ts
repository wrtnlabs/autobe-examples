import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPayment";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminOrdersOrderNumberPayment(props: {
  admin: AdminPayload;
  orderNumber: string;
  body: IShoppingMallOrderPayment.IUpdate;
}): Promise<IShoppingMallOrderPayment> {
  // Find the order using the provided order_number
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      order_number: props.orderNumber,
      deleted_at: null,
    },
  });

  if (!order) {
    throw new HttpException("Order not found", 404);
  }

  // Find the corresponding payment record
  const payment = await MyGlobal.prisma.shopping_mall_order_payments.findFirst({
    where: {
      shopping_mall_order_id: order.id,
    },
  });

  if (!payment) {
    throw new HttpException("Payment record not found", 404);
  }

  // Validate status transition (business rules)
  const currentStatus = payment.payment_status;
  const newStatus = props.body.payment_status;

  // Define valid transitions based on payment lifecycle
  const validTransitions: Record<string, string[]> = {
    pending: ["processing", "failed"],
    processing: ["authorized", "failed"],
    authorized: ["captured", "failed"],
    captured: ["refunded", "chargeback", "failed"],
    refunded: ["chargeback", "failed"],
    failed: [],
    chargeback: [],
  };

  const allowedTransitions = validTransitions[currentStatus];
  if (!allowedTransitions || !allowedTransitions.includes(newStatus)) {
    throw new HttpException("Invalid payment status transition", 400);
  }

  // Update the payment record with new status and update timestamp
  const updatedPayment =
    await MyGlobal.prisma.shopping_mall_order_payments.update({
      where: {
        id: payment.id,
      },
      data: {
        payment_status: newStatus,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  // Return the updated payment record with proper date formatting
  return {
    id: updatedPayment.id,
    shopping_mall_order_id: updatedPayment.shopping_mall_order_id,
    shopping_mall_payment_method_id:
      updatedPayment.shopping_mall_payment_method_id,
    amount: updatedPayment.amount,
    currency: updatedPayment.currency,
    payment_status: updatedPayment.payment_status satisfies string as
      | "refunded"
      | "pending"
      | "processing"
      | "authorized"
      | "captured"
      | "failed"
      | "chargeback",
    transaction_id: updatedPayment.transaction_id ?? undefined,
    processed_at: updatedPayment.processed_at
      ? toISOStringSafe(updatedPayment.processed_at)
      : undefined,
    created_at: toISOStringSafe(updatedPayment.created_at),
    updated_at: toISOStringSafe(updatedPayment.updated_at),
  };
}
