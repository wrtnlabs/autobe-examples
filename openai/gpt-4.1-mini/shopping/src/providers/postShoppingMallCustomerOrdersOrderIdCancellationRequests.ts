import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerOrdersOrderIdCancellationRequests(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallCancellationRequest.ICreate;
}): Promise<IShoppingMallCancellationRequest> {
  const { customer, orderId, body } = props;

  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      shopping_mall_customer_id: true,
      status: true,
    },
  });

  if (!order || order.shopping_mall_customer_id !== customer.id) {
    throw new HttpException(
      "Forbidden: You do not have permission to cancel this order",
      403,
    );
  }

  if (order.status !== "Pending Payment" && order.status !== "Paid") {
    throw new HttpException(
      `Cannot cancel order in current status: ${order.status}`,
      403,
    );
  }

  const now = toISOStringSafe(new Date());

  const created =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shopping_mall_order_id: orderId,
        shopping_mall_customer_id: customer.id,
        reason: body.reason,
        status: "pending",
        requested_at: body.requested_at,
        processed_at: null,
        created_at: body.created_at ?? now,
        updated_at: body.updated_at ?? now,
      },
    });

  return {
    id: created.id,
    shopping_mall_order_id: created.shopping_mall_order_id,
    shopping_mall_customer_id: created.shopping_mall_customer_id,
    reason: created.reason,
    status: typia.assert<"pending" | "approved" | "rejected">(created.status),
    requested_at: toISOStringSafe(created.requested_at),
    processed_at:
      created.processed_at === null
        ? null
        : toISOStringSafe(created.processed_at),
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
