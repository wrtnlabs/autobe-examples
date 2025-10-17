import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingMallSellerOrdersOrderIdCancellationRequestsCancellationRequestId(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  cancellationRequestId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCancellationRequest> {
  const { seller, orderId, cancellationRequestId } = props;

  const cancellationRequest =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findFirstOrThrow({
      where: {
        id: cancellationRequestId,
        shopping_mall_order_id: orderId,
      },
    });

  const order = await MyGlobal.prisma.shopping_mall_orders.findFirstOrThrow({
    where: {
      id: orderId,
    },
  });

  if (order.shopping_mall_seller_id !== seller.id) {
    throw new HttpException(
      "Forbidden: You do not have access to this cancellation request",
      403,
    );
  }

  return {
    id: cancellationRequest.id,
    shopping_mall_order_id: cancellationRequest.shopping_mall_order_id,
    shopping_mall_customer_id: cancellationRequest.shopping_mall_customer_id,
    reason: cancellationRequest.reason,
    status: typia.assert<"pending" | "approved" | "rejected">(
      cancellationRequest.status,
    ),
    requested_at: toISOStringSafe(cancellationRequest.requested_at),
    processed_at: cancellationRequest.processed_at
      ? toISOStringSafe(cancellationRequest.processed_at)
      : null,
    created_at: toISOStringSafe(cancellationRequest.created_at),
    updated_at: toISOStringSafe(cancellationRequest.updated_at),
  };
}
