import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerPaymentsPaymentId(props: {
  seller: SellerPayload;
  paymentId: string & tags.Format<"uuid">;
  body: IShoppingMallPayment.IUpdate;
}): Promise<IShoppingMallPayment> {
  const existing = await MyGlobal.prisma.shopping_mall_payments.findUnique({
    where: { id: props.paymentId },
  });

  if (!existing || existing.deleted_at !== null) {
    throw new HttpException("Payment record not found", 404);
  }

  if (
    props.body.transaction_id !== undefined &&
    props.body.transaction_id !== existing.transaction_id
  ) {
    const conflict = await MyGlobal.prisma.shopping_mall_payments.findUnique({
      where: { transaction_id: props.body.transaction_id },
    });
    if (conflict) {
      throw new HttpException("Transaction ID already exists", 409);
    }
  }

  const now = toISOStringSafe(new Date());

  const payment_date_value =
    props.body.payment_date ??
    (typeof existing.payment_date === "string"
      ? existing.payment_date
      : toISOStringSafe(existing.payment_date));

  const updated = await MyGlobal.prisma.shopping_mall_payments.update({
    where: { id: props.paymentId },
    data: {
      payment_method: props.body.payment_method ?? existing.payment_method,
      payment_status: props.body.payment_status ?? existing.payment_status,
      payment_amount: props.body.payment_amount ?? existing.payment_amount,
      transaction_id: props.body.transaction_id ?? existing.transaction_id,
      payment_date: payment_date_value,
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    shopping_mall_order_id: updated.shopping_mall_order_id,
    payment_method: updated.payment_method,
    payment_status: updated.payment_status,
    payment_amount: updated.payment_amount,
    transaction_id: updated.transaction_id,
    payment_date: (typeof updated.payment_date === "string"
      ? updated.payment_date
      : toISOStringSafe(updated.payment_date)) as string &
      tags.Format<"date-time">,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null ? null : toISOStringSafe(updated.deleted_at),
  };
}
