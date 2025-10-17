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

export async function getShoppingMallCustomerOrdersOrderIdRefundRequestsRefundRequestId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  refundRequestId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallRefundRequest> {
  const { customer, orderId, refundRequestId } = props;

  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: orderId },
    select: { shopping_mall_customer_id: true },
  });

  if (order.shopping_mall_customer_id !== customer.id) {
    throw new HttpException("Not Found", 404);
  }

  const refundRequest =
    await MyGlobal.prisma.shopping_mall_refund_requests.findUniqueOrThrow({
      where: { id: refundRequestId },
    });

  if (
    refundRequest.shopping_mall_order_id !== orderId ||
    refundRequest.shopping_mall_customer_id !== customer.id
  ) {
    throw new HttpException("Not Found", 404);
  }

  const {
    id,
    shopping_mall_order_id,
    shopping_mall_customer_id,
    reason,
    refund_amount,
    status,
    requested_at,
    processed_at,
    created_at,
    updated_at,
  } = refundRequest;

  return {
    id,
    shopping_mall_order_id,
    shopping_mall_customer_id,
    reason,
    refund_amount,
    status: typia.assert<"Pending" | "Approved" | "Rejected">(status),
    requested_at: toISOStringSafe(requested_at),
    processed_at:
      processed_at !== null && processed_at !== undefined
        ? toISOStringSafe(processed_at)
        : null,
    created_at: toISOStringSafe(created_at),
    updated_at: toISOStringSafe(updated_at),
  };
}
