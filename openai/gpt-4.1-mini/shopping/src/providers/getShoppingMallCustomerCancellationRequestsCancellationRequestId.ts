import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerCancellationRequestsCancellationRequestId(props: {
  customer: CustomerPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCancellationRequest> {
  const record =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findUnique({
      where: { id: props.cancellationRequestId },
    });
  if (!record) {
    throw new HttpException("Cancellation request not found", 404);
  }
  if (record.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Cancellation request not found", 404);
  }
  return {
    id: record.id,
    shopping_mall_customer_id: record.shopping_mall_customer_id,
    shopping_mall_order_item_id: record.shopping_mall_order_item_id,
    reason: record.reason,
    seller_approval_status: record.seller_approval_status,
    seller_approval_reason:
      record.seller_approval_reason === null
        ? null
        : record.seller_approval_reason,
    requested_at: toISOStringSafe(record.requested_at),
    processed_at:
      record.processed_at === null
        ? null
        : toISOStringSafe(record.processed_at),
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
  };
}
