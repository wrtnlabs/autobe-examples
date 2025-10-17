import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminOrdersOrderIdRefundRequests(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallRefundRequest.IUpdate;
}): Promise<IShoppingMallRefundRequest> {
  const { admin, orderId, body } = props;

  const refundRequest =
    await MyGlobal.prisma.shopping_mall_refund_requests.findFirst({
      where: {
        shopping_mall_order_id: orderId,
      },
    });

  if (refundRequest === null) {
    throw new HttpException("Refund request not found.", 404);
  }

  const updated = await MyGlobal.prisma.shopping_mall_refund_requests.update({
    where: {
      id: refundRequest.id,
    },
    data: {
      shopping_mall_order_id: body.shopping_mall_order_id,
      shopping_mall_customer_id: body.shopping_mall_customer_id,
      reason: body.reason,
      refund_amount: body.refund_amount,
      status: body.status,
      requested_at:
        body.requested_at !== null && body.requested_at !== undefined
          ? toISOStringSafe(body.requested_at)
          : undefined,
      processed_at:
        body.processed_at !== null && body.processed_at !== undefined
          ? toISOStringSafe(body.processed_at)
          : undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    shopping_mall_order_id: updated.shopping_mall_order_id,
    shopping_mall_customer_id: updated.shopping_mall_customer_id,
    reason: updated.reason,
    refund_amount: updated.refund_amount,
    status: updated.status as "Pending" | "Approved" | "Rejected",
    requested_at: updated.requested_at
      ? toISOStringSafe(updated.requested_at)
      : "",
    processed_at:
      updated.processed_at !== null && updated.processed_at !== undefined
        ? toISOStringSafe(updated.processed_at)
        : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
