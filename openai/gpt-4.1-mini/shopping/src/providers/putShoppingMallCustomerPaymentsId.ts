import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerPaymentsId(props: {
  customer: CustomerPayload;
  id: string & tags.Format<"uuid">;
  body: IShoppingMallPayment.IUpdate;
}): Promise<IShoppingMallPayment> {
  const { customer, id, body } = props;

  const payment = await MyGlobal.prisma.shopping_mall_payments.findUnique({
    where: { id },
    include: { order: true },
  });

  if (!payment) {
    throw new HttpException("Payment record not found", 404);
  }

  if (payment.order.shopping_mall_customer_id !== customer.id) {
    throw new HttpException("Forbidden: You do not own this payment", 403);
  }

  const updated = await MyGlobal.prisma.shopping_mall_payments.update({
    where: { id },
    data: {
      payment_method: body.payment_method,
      payment_status: body.payment_status,
      payment_amount: body.payment_amount,
      payment_date: body.payment_date,
      updated_at: toISOStringSafe(new Date()),
    },
    select: {
      id: true,
      shopping_mall_order_id: true,
      payment_method: true,
      payment_status: true,
      payment_amount: true,
      payment_date: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  return {
    id: updated.id,
    shopping_mall_order_id: updated.shopping_mall_order_id,
    payment_method: updated.payment_method,
    payment_status: updated.payment_status,
    payment_amount: updated.payment_amount,
    payment_date: toISOStringSafe(updated.payment_date),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null ? toISOStringSafe(updated.deleted_at) : null,
  };
}
