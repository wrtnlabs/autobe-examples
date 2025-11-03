import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingRefundStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundStatusHistory";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingSellerRefundsRefundRequestIdStatusesStatusHistoryId(props: {
  seller: SellerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  statusHistoryId: string & tags.Format<"uuid">;
}): Promise<IShoppingRefundStatusHistory> {
  const { seller, refundRequestId, statusHistoryId } = props;

  // Step 1: Lookup the status history record by statusHistoryId
  const history =
    await MyGlobal.prisma.shopping_refund_status_histories.findUnique({
      where: { id: statusHistoryId },
    });
  if (!history) {
    throw new HttpException("Not Found", 404);
  }
  // Step 2: Validate refund request id matches
  if (history.shopping_refund_request_id !== refundRequestId) {
    throw new HttpException("Not Found", 404);
  }

  // Step 3: Retrieve the refund request row
  const refundRequest =
    await MyGlobal.prisma.shopping_refund_requests.findUnique({
      where: { id: refundRequestId },
      select: { shopping_order_id: true },
    });
  if (!refundRequest) {
    // Should be impossible but double-check; fail hard if missing
    throw new HttpException("Not Found", 404);
  }

  // Step 4: Retrieve all order lines for the order to check seller involvement
  const sellerOrderLine = await MyGlobal.prisma.shopping_order_lines.findFirst({
    where: {
      shopping_order_id: refundRequest.shopping_order_id,
      shopping_seller_id: seller.id,
      deleted_at: null,
    },
  });
  if (!sellerOrderLine) {
    throw new HttpException(
      "Forbidden: You are not authorized to access this refund's status history",
      403,
    );
  }

  // Step 5: Assemble and return DTO
  return {
    id: history.id,
    shopping_refund_request_id: history.shopping_refund_request_id,
    shopping_actor_id: history.shopping_actor_id,
    actor_type: typia.assert<"customer" | "seller" | "admin">(
      history.actor_type,
    ),
    previous_status: history.previous_status,
    new_status: history.new_status,
    timestamp: toISOStringSafe(history.timestamp),
    change_context: history.change_context ?? undefined,
  };
}
