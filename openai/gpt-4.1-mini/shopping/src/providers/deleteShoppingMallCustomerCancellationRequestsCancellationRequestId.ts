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

export async function deleteShoppingMallCustomerCancellationRequestsCancellationRequestId(props: {
  customer: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "customer";
  };
  cancellationRequestId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCancellationRequest> {
  const record =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findUnique({
      where: { id: props.cancellationRequestId },
    });
  if (!record) throw new HttpException("Cancellation request not found", 404);
  if (record.shopping_mall_customer_id !== props.customer.id)
    throw new HttpException("Forbidden", 403);
  const deleted =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.delete({
      where: { id: props.cancellationRequestId },
    });
  return {
    id: deleted.id,
    shopping_mall_customer_id: deleted.shopping_mall_customer_id,
    shopping_mall_order_item_id: deleted.shopping_mall_order_item_id,
    reason: deleted.reason,
    seller_approval_status: deleted.seller_approval_status,
    seller_approval_reason: deleted.seller_approval_reason ?? null,
    requested_at: toISOStringSafe(deleted.requested_at),
    processed_at: deleted.processed_at
      ? toISOStringSafe(deleted.processed_at)
      : null,
    created_at: toISOStringSafe(deleted.created_at),
    updated_at: toISOStringSafe(deleted.updated_at),
    deleted_at: deleted.deleted_at ? toISOStringSafe(deleted.deleted_at) : null,
  };
}
