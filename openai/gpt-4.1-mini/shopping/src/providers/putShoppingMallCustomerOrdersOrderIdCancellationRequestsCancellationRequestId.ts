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

export async function putShoppingMallCustomerOrdersOrderIdCancellationRequestsCancellationRequestId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  cancellationRequestId: string & tags.Format<"uuid">;
  body: IShoppingMallCancellationRequest.IUpdate;
}): Promise<IShoppingMallCancellationRequest> {
  const { customer, orderId, cancellationRequestId, body } = props;

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
    throw new HttpException(
      "Forbidden: Cannot update cancellation request of another customer",
      403,
    );
  }

  if (cancellationRequest.status !== "pending") {
    throw new HttpException("Cancellation request already processed", 409);
  }

  const requestedAt =
    body.requested_at === undefined || body.requested_at === null
      ? undefined
      : toISOStringSafe(body.requested_at);
  const processedAt =
    body.processed_at === undefined || body.processed_at === null
      ? undefined
      : toISOStringSafe(body.processed_at);
  const createdAt =
    body.created_at === undefined || body.created_at === null
      ? undefined
      : toISOStringSafe(body.created_at);
  const updatedAt =
    body.updated_at === undefined || body.updated_at === null
      ? undefined
      : toISOStringSafe(body.updated_at);

  const updated =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.update({
      where: { id: cancellationRequestId },
      data: {
        reason: body.reason,
        status: typia.assert<"pending" | "approved" | "rejected">(body.status),
        requested_at: requestedAt,
        processed_at: processedAt,
        created_at: createdAt,
        updated_at: updatedAt,
      },
    });

  return {
    id: updated.id,
    shopping_mall_order_id: updated.shopping_mall_order_id,
    shopping_mall_customer_id: updated.shopping_mall_customer_id,
    reason: updated.reason,
    status: typia.assert<"pending" | "approved" | "rejected">(updated.status),
    requested_at: toISOStringSafe(updated.requested_at),
    processed_at: updated.processed_at
      ? toISOStringSafe(updated.processed_at)
      : toISOStringSafe(new Date()),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
