import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerShoppingMallOrdersOrderId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrder.IUpdate;
}): Promise<IShoppingMallOrder> {
  const existingOrder = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      id: props.orderId,
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
  });

  if (!existingOrder) {
    throw new HttpException("Order not found", 404);
  }

  const now = toISOStringSafe(new Date()) as string & tags.Format<"date-time">;

  const updated = await MyGlobal.prisma.shopping_mall_orders.update({
    where: { id: props.orderId },
    data: {
      order_number: props.body.order_number ?? undefined,
      status: props.body.status ?? undefined,
      payment_status: props.body.payment_status ?? undefined,
      total_amount: props.body.total_amount ?? undefined,
      updated_at: now,
      deleted_at: props.body.deleted_at ?? undefined,
    },
  });

  return {
    id: updated.id,
    shopping_mall_customer_id: updated.shopping_mall_customer_id,
    order_number: updated.order_number,
    status: updated.status,
    payment_status: updated.payment_status,
    total_amount: updated.total_amount,
    created_at: toISOStringSafe(updated.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(updated.updated_at) as string &
      tags.Format<"date-time">,
    deleted_at: updated.deleted_at
      ? (toISOStringSafe(updated.deleted_at) as string &
          tags.Format<"date-time">)
      : null,
  };
}
