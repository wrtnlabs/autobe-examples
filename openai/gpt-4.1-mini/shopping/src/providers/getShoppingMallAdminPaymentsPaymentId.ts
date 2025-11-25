import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminPaymentsPaymentId(props: {
  admin: AdminPayload;
  paymentId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallPayment> {
  const payment = await MyGlobal.prisma.shopping_mall_payments.findUnique({
    where: { id: props.paymentId },
  });

  if (!payment) {
    throw new HttpException("Payment not found", 404);
  }

  return {
    id: payment.id,
    shopping_mall_order_id: payment.shopping_mall_order_id,
    payment_method: payment.payment_method,
    payment_status: payment.payment_status,
    payment_amount: payment.payment_amount,
    transaction_id: payment.transaction_id,
    payment_date: toISOStringSafe(payment.payment_date),
    created_at: toISOStringSafe(payment.created_at),
    updated_at: toISOStringSafe(payment.updated_at),
    deleted_at: payment.deleted_at ? toISOStringSafe(payment.deleted_at) : null,
  };
}
