import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingRefundStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundStatusHistory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingAdminRefundsRefundRequestIdStatusesStatusHistoryId(props: {
  admin: AdminPayload;
  refundRequestId: string & tags.Format<"uuid">;
  statusHistoryId: string & tags.Format<"uuid">;
}): Promise<IShoppingRefundStatusHistory> {
  const history =
    await MyGlobal.prisma.shopping_refund_status_histories.findFirst({
      where: {
        id: props.statusHistoryId,
        shopping_refund_request_id: props.refundRequestId,
      },
    });
  if (!history) {
    throw new HttpException("Refund status history not found", 404);
  }
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
