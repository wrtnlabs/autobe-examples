import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminOrdersOrderIdCancellationRequests(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallCancellationRequest.ICreate;
}): Promise<IShoppingMallCancellationRequest> {
  const { admin, orderId, body } = props;

  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: orderId },
  });
  if (!order) {
    throw new HttpException("Order not found", 404);
  }

  if (order.shopping_mall_customer_id !== body.shopping_mall_customer_id) {
    throw new HttpException("Forbidden: Customer mismatch", 403);
  }

  if (body.status !== "pending") {
    throw new HttpException("Status must be 'pending' on creation", 400);
  }

  const newId = v4() as string & tags.Format<"uuid">;

  const createdCancellationRequest =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.create({
      data: {
        id: newId,
        shopping_mall_order_id: orderId,
        shopping_mall_customer_id: body.shopping_mall_customer_id,
        reason: body.reason,
        status: "pending" as "pending",
        requested_at: toISOStringSafe(body.requested_at),
        processed_at:
          body.processed_at === null || body.processed_at === undefined
            ? null
            : toISOStringSafe(body.processed_at),
        created_at: toISOStringSafe(body.created_at ?? body.requested_at),
        updated_at: toISOStringSafe(body.updated_at ?? body.requested_at),
      },
    });

  return {
    id: createdCancellationRequest.id as string & tags.Format<"uuid">,
    shopping_mall_order_id:
      createdCancellationRequest.shopping_mall_order_id as string &
        tags.Format<"uuid">,
    shopping_mall_customer_id:
      createdCancellationRequest.shopping_mall_customer_id as string &
        tags.Format<"uuid">,
    reason: createdCancellationRequest.reason,
    status: typia.assert<"pending" | "approved" | "rejected">(
      createdCancellationRequest.status,
    ),
    requested_at: toISOStringSafe(createdCancellationRequest.requested_at),
    processed_at: createdCancellationRequest.processed_at
      ? toISOStringSafe(createdCancellationRequest.processed_at)
      : null,
    created_at: toISOStringSafe(createdCancellationRequest.created_at),
    updated_at: toISOStringSafe(createdCancellationRequest.updated_at),
  };
}
