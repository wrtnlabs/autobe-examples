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

export async function postShoppingMallCustomerOrdersOrderIdPayments(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallPayment.ICreate;
}): Promise<IShoppingMallPayment> {
  const { customer, orderId, body } = props;

  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: orderId },
  });

  if (order.shopping_mall_customer_id !== customer.id) {
    throw new HttpException("Unauthorized: Access to order denied", 403);
  }

  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.shopping_mall_payments.create({
    data: {
      id,
      shopping_mall_order_id: orderId,
      payment_amount: body.payment_amount,
      payment_method: body.payment_method,
      payment_status: body.payment_status,
      transaction_id: body.transaction_id ?? null,
      confirmed_at: body.confirmed_at ?? null,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    shopping_mall_order_id: created.shopping_mall_order_id,
    payment_amount: created.payment_amount,
    payment_method: created.payment_method,
    payment_status: created.payment_status,
    transaction_id: created.transaction_id ?? undefined,
    confirmed_at: created.confirmed_at
      ? toISOStringSafe(created.confirmed_at)
      : null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
