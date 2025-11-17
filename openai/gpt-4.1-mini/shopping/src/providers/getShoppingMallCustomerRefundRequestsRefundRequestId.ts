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

export async function getShoppingMallCustomerRefundRequestsRefundRequestId(props: {
  customer: CustomerPayload;
  refundRequestId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallRefundRequest> {
  const record = await MyGlobal.prisma.shopping_mall_refund_requests.findUnique(
    {
      where: { id: props.refundRequestId },
    },
  );

  if (!record) {
    throw new HttpException("Refund request not found", 404);
  }

  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: record.shopping_mall_order_id },
  });

  if (!order) {
    throw new HttpException("Associated order not found", 404);
  }

  if (order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }

  return {
    id: record.id,
    shopping_mall_order_id: record.shopping_mall_order_id,
    refund_amount: record.refund_amount,
    refund_reason: record.refund_reason,
    refund_status: record.refund_status,
    requested_at: toISOStringSafe(record.requested_at),
    processed_at:
      record.processed_at === null
        ? undefined
        : toISOStringSafe(record.processed_at),
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at === null
        ? undefined
        : toISOStringSafe(record.deleted_at),
  };
}
