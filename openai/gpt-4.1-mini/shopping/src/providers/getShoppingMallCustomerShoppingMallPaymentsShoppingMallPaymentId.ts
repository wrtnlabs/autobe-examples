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

export async function getShoppingMallCustomerShoppingMallPaymentsShoppingMallPaymentId(props: {
  customer: CustomerPayload;
  shoppingMallPaymentId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallPayment> {
  const payment = await MyGlobal.prisma.shopping_mall_payments.findUnique({
    where: { id: props.shoppingMallPaymentId },
  });

  if (!payment) {
    throw new HttpException("Shopping mall payment not found", 404);
  }

  return {
    id: payment.id,
    shopping_mall_order_id: payment.shopping_mall_order_id,
    payment_method: typia.assert<
      "other" | "card" | "bank_transfer" | "paypal" | "cash"
    >(payment.payment_method),
    amount: payment.amount,
    status: typia.assert<
      "pending" | "cancelled" | "refunded" | "completed" | "failed"
    >(payment.status),
    transaction_id:
      payment.transaction_id === null ? undefined : payment.transaction_id,
    created_at: toISOStringSafe(payment.created_at),
    updated_at:
      payment.updated_at === null ? null : toISOStringSafe(payment.updated_at),
    deleted_at:
      payment.deleted_at === null ? null : toISOStringSafe(payment.deleted_at),
  };
}
