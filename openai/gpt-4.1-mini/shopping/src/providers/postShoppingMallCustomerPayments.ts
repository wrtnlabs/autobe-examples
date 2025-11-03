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

export async function postShoppingMallCustomerPayments(props: {
  customer: CustomerPayload;
  body: IShoppingMallPayment.ICreate;
}): Promise<IShoppingMallPayment> {
  const { customer, body } = props;

  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: body.shopping_mall_order_id },
  });

  if (order.deleted_at !== null) {
    throw new HttpException("Order not found", 404);
  }

  if (order.shopping_mall_customer_id !== customer.id) {
    throw new HttpException(
      "Unauthorized: order does not belong to customer",
      403,
    );
  }

  if (body.payment_amount !== order.total_amount) {
    throw new HttpException("Payment amount does not match order total", 400);
  }

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.shopping_mall_payments.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_order_id: body.shopping_mall_order_id,
      payment_method: body.payment_method,
      payment_status: body.payment_status,
      payment_amount: body.payment_amount,
      payment_date: toISOStringSafe(body.payment_date),
      created_at: now,
      updated_at: now,
    },
    include: {
      order: {
        select: {
          id: true,
          order_code: true,
          status: true,
          payment_status: true,
          total_amount: true,
          shipping_address: true,
          created_at: true,
          updated_at: true,
          customer: {
            select: {
              id: true,
              email: true,
              nickname: true,
              created_at: true,
            },
          },
          // comments removed due to non-existence in schema
        },
      },
    },
  });

  return {
    id: created.id,
    shopping_mall_order_id: created.shopping_mall_order_id,
    payment_method: created.payment_method,
    payment_status: created.payment_status,
    payment_amount: created.payment_amount,
    payment_date: toISOStringSafe(created.payment_date),
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null ? toISOStringSafe(created.deleted_at) : null,
    // Remove order property entirely to respect type and avoid required properties missing error
    order: undefined,
  };
}
