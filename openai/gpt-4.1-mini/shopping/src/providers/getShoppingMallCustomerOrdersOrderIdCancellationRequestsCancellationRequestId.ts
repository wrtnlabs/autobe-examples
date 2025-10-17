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

export async function getShoppingMallCustomerOrdersOrderIdCancellationRequestsCancellationRequestId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  cancellationRequestId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCancellationRequest> {
  const { customer, orderId, cancellationRequestId } = props;

  const cancellationRequest =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findFirst({
      where: {
        id: cancellationRequestId,
        shopping_mall_order_id: orderId,
      },
    });

  if (!cancellationRequest) {
    throw new HttpException("Cancellation request not found", 404);
  }

  if (cancellationRequest.shopping_mall_customer_id !== customer.id) {
    throw new HttpException("Forbidden: Access denied", 403);
  }

  return {
    id: cancellationRequest.id,
    shopping_mall_order_id: cancellationRequest.shopping_mall_order_id,
    shopping_mall_customer_id: cancellationRequest.shopping_mall_customer_id,
    reason: cancellationRequest.reason,
    status: cancellationRequest.status as "pending" | "approved" | "rejected",
    requested_at: toISOStringSafe(cancellationRequest.requested_at),
    processed_at: cancellationRequest.processed_at
      ? toISOStringSafe(cancellationRequest.processed_at)
      : null,
    created_at: toISOStringSafe(cancellationRequest.created_at),
    updated_at: toISOStringSafe(cancellationRequest.updated_at),
  };
}
