import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderRefund";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerShoppingMallOrderRefunds(props: {
  customer: CustomerPayload;
  body: IShoppingMallOrderRefund.ICreate;
}): Promise<IShoppingMallOrderRefund> {
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: props.body.shoppingMallOrderId },
  });

  if (order === null || order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Order not found or access forbidden", 404);
  }

  const now = new Date();

  const created = await MyGlobal.prisma.shopping_mall_order_refunds.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_order_id: props.body.shoppingMallOrderId,
      shopping_mall_customer_id: props.customer.id,
      amount: props.body.amount,
      status: typia.assert<"approved" | "pending" | "rejected">(
        props.body.status,
      ),
      reason: props.body.reason === null ? null : props.body.reason,
      created_at: toISOStringSafe(now),
      updated_at: toISOStringSafe(now),
    },
  });

  return {
    id: created.id,
    shoppingMallOrderId: created.shopping_mall_order_id,
    shoppingMallCustomerId: created.shopping_mall_customer_id,
    amount: created.amount,
    status: created.status as "approved" | "pending" | "rejected",
    reason: typia.assert<string>(created.reason === null ? "" : created.reason),
    approved_at: null,
    createdAt: toISOStringSafe(created.created_at),
    updatedAt:
      created.updated_at === null
        ? undefined
        : toISOStringSafe(created.updated_at),
  };
}
