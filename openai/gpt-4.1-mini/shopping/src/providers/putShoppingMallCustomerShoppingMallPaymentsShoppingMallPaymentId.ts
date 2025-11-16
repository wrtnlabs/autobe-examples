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

export async function putShoppingMallCustomerShoppingMallPaymentsShoppingMallPaymentId(props: {
  customer: CustomerPayload;
  shoppingMallPaymentId: string & tags.Format<"uuid">;
  body: IShoppingMallPayment.IUpdate;
}): Promise<IShoppingMallPayment> {
  const existing = await MyGlobal.prisma.shopping_mall_payments.findUnique({
    where: { id: props.shoppingMallPaymentId },
  });

  if (!existing) {
    throw new HttpException("Payment record not found", 404);
  }

  const updated = await MyGlobal.prisma.shopping_mall_payments.update({
    where: { id: props.shoppingMallPaymentId },
    data: {
      ...props.body,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    shopping_mall_order_id: updated.shopping_mall_order_id,
    payment_method: typia.assert<
      "other" | "card" | "bank_transfer" | "paypal" | "cash"
    >(updated.payment_method),
    amount: updated.amount,
    status: typia.assert<
      "pending" | "cancelled" | "refunded" | "completed" | "failed"
    >(updated.status),
    transaction_id:
      updated.transaction_id === null
        ? null
        : (updated.transaction_id ?? undefined),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: updated.updated_at ? toISOStringSafe(updated.updated_at) : null,
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
