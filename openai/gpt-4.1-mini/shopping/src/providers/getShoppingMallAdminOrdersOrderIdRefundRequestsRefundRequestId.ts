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

export async function getShoppingMallAdminOrdersOrderIdRefundRequestsRefundRequestId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  refundRequestId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallRefundRequest> {
  const { admin, orderId, refundRequestId } = props;

  const refundRequest =
    await MyGlobal.prisma.shopping_mall_refund_requests.findFirstOrThrow({
      where: {
        id: refundRequestId,
        shopping_mall_order_id: orderId,
      },
    });

  return {
    id: refundRequest.id,
    shopping_mall_order_id: refundRequest.shopping_mall_order_id,
    shopping_mall_customer_id: refundRequest.shopping_mall_customer_id,
    reason: refundRequest.reason,
    refund_amount: refundRequest.refund_amount,
    status: typia.assert<"Pending" | "Approved" | "Rejected">(
      refundRequest.status,
    ),
    requested_at: toISOStringSafe(refundRequest.requested_at),
    processed_at: refundRequest.processed_at
      ? toISOStringSafe(refundRequest.processed_at)
      : null,
    created_at: toISOStringSafe(refundRequest.created_at),
    updated_at: toISOStringSafe(refundRequest.updated_at),
  };
}
