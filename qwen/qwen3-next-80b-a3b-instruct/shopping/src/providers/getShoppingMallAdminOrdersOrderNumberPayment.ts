import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPayment";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminOrdersOrderNumberPayment(props: {
  admin: AdminPayload;
  orderNumber: string;
}): Promise<IShoppingMallOrderPayment> {
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      order_number: props.orderNumber,
      deleted_at: null,
    },
  });

  if (!order) {
    throw new HttpException("Order not found", 404);
  }

  const payment = await MyGlobal.prisma.shopping_mall_order_payments.findUnique(
    {
      where: {
        shopping_mall_order_id: order.id,
      },
    },
  );

  if (!payment) {
    throw new HttpException("Payment record not found", 404);
  }

  return {
    id: payment.id,
    shopping_mall_order_id: payment.shopping_mall_order_id,
    shopping_mall_payment_method_id: payment.shopping_mall_payment_method_id,
    amount: payment.amount,
    currency: payment.currency,
    payment_status: payment.payment_status satisfies string as
      | "refunded"
      | "pending"
      | "processing"
      | "authorized"
      | "captured"
      | "failed"
      | "chargeback",
    transaction_id:
      payment.transaction_id !== null
        ? (payment.transaction_id satisfies string as string &
            tags.MaxLength<255>)
        : undefined,
    processed_at: payment.processed_at
      ? toISOStringSafe(payment.processed_at)
      : undefined,
    created_at: toISOStringSafe(payment.created_at),
    updated_at: toISOStringSafe(payment.updated_at),
  };
}
