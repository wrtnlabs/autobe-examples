import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingRefundStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundStatusHistory";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingCustomerRefundsRefundRequestIdStatusesStatusHistoryId(props: {
  customer: CustomerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  statusHistoryId: string & tags.Format<"uuid">;
}): Promise<IShoppingRefundStatusHistory> {
  // Fetch the status history entry for the combined refundRequestId and statusHistoryId
  const statusHistory =
    await MyGlobal.prisma.shopping_refund_status_histories.findUnique({
      where: { id: props.statusHistoryId },
    });
  if (
    !statusHistory ||
    statusHistory.shopping_refund_request_id !== props.refundRequestId
  ) {
    throw new HttpException("Status history entry not found", 404);
  }

  // Fetch the parent refund request for authorization and contextual filtering
  const refundRequest =
    await MyGlobal.prisma.shopping_refund_requests.findUnique({
      where: { id: props.refundRequestId },
      select: {
        shopping_actor_id: true,
      },
    });
  if (!refundRequest) {
    throw new HttpException("Refund request not found", 404);
  }
  // Customer can only access status histories for refund requests they own
  if (refundRequest.shopping_actor_id !== props.customer.id) {
    throw new HttpException("Forbidden: Not your refund request", 403);
  }

  return {
    id: statusHistory.id,
    shopping_refund_request_id: statusHistory.shopping_refund_request_id,
    shopping_actor_id: statusHistory.shopping_actor_id,
    actor_type: typia.assert<"customer" | "seller" | "admin">(
      statusHistory.actor_type,
    ),
    previous_status: statusHistory.previous_status,
    new_status: statusHistory.new_status,
    timestamp: toISOStringSafe(statusHistory.timestamp),
    change_context: statusHistory.change_context ?? undefined,
  };
}
