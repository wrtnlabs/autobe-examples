import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerOrdersOrderIdRefundRequests(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallRefundRequest.ICreate;
}): Promise<void> {
  const { customer, orderId, body } = props;

  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: orderId },
  });

  if (!order || order.shopping_mall_customer_id !== customer.id) {
    throw new HttpException(
      "Order not found or does not belong to customer",
      404,
    );
  }

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const id: string & tags.Format<"uuid"> = v4();

  await MyGlobal.prisma.shopping_mall_refund_requests.create({
    data: {
      id,
      shopping_mall_order_id: orderId,
      shopping_mall_customer_id: customer.id,
      reason: body.reason,
      refund_amount: body.refund_amount,
      status: "Pending",
      requested_at: body.requested_at,
      created_at: now,
      updated_at: now,
    },
  });
}
