import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminPaymentsPaymentId(props: {
  admin: AdminPayload;
  paymentId: string & tags.Format<"uuid">;
  body: IShoppingMallPayment.IUpdate;
}): Promise<IShoppingMallPayment> {
  const existing = await MyGlobal.prisma.shopping_mall_payments.findUnique({
    where: { id: props.paymentId },
  });
  if (!existing) {
    throw new HttpException("Payment record not found", 404);
  }

  if (
    props.body.transaction_id !== undefined &&
    props.body.transaction_id !== existing.transaction_id
  ) {
    const duplicate = await MyGlobal.prisma.shopping_mall_payments.findUnique({
      where: { transaction_id: props.body.transaction_id },
    });
    if (duplicate) {
      throw new HttpException("Duplicate transaction_id", 400);
    }
  }

  const updated = await MyGlobal.prisma.shopping_mall_payments.update({
    where: { id: props.paymentId },
    data: {
      ...props.body,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    shopping_mall_order_id: updated.shopping_mall_order_id,
    payment_method: updated.payment_method,
    payment_status: updated.payment_status,
    payment_amount: updated.payment_amount,
    transaction_id: updated.transaction_id,
    payment_date: toISOStringSafe(updated.payment_date),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null ? null : toISOStringSafe(updated.deleted_at),
  };
}
