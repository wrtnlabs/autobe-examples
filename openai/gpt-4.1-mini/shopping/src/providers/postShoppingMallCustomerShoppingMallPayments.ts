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

export async function postShoppingMallCustomerShoppingMallPayments(props: {
  customer: CustomerPayload;
  body: IShoppingMallPayment.ICreate;
}): Promise<IShoppingMallPayment> {
  const existsOrder = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      id: props.body.shopping_mall_order_id,
      deleted_at: null,
    },
    select: { id: true },
  });

  if (existsOrder === null) {
    throw new HttpException("Order not found", 404);
  }

  const created = await MyGlobal.prisma.shopping_mall_payments.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_order_id: props.body.shopping_mall_order_id,
      payment_method: props.body.payment_method,
      amount: props.body.amount,
      status: props.body.status,
      transaction_id: props.body.transaction_id ?? null,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: created.id,
    shopping_mall_order_id: created.shopping_mall_order_id,
    payment_method: typia.assert<
      "other" | "card" | "bank_transfer" | "paypal" | "cash"
    >(created.payment_method),
    amount: created.amount,
    status: typia.assert<
      "pending" | "cancelled" | "refunded" | "completed" | "failed"
    >(created.status),
    transaction_id: created.transaction_id ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: created.updated_at ? toISOStringSafe(created.updated_at) : null,
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
