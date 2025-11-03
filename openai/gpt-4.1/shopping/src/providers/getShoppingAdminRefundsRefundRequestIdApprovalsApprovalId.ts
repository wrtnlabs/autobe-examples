import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingRefundApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundApproval";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingAdminRefundsRefundRequestIdApprovalsApprovalId(props: {
  admin: AdminPayload;
  refundRequestId: string & tags.Format<"uuid">;
  approvalId: string & tags.Format<"uuid">;
}): Promise<IShoppingRefundApproval> {
  const approval = await MyGlobal.prisma.shopping_refund_approvals.findFirst({
    where: {
      id: props.approvalId,
      shopping_refund_request_id: props.refundRequestId,
    },
    select: {
      id: true,
      shopping_refund_request_id: true,
      shopping_refund_status_history_id: true,
      actor_type: true,
      shopping_actor_id: true,
      action: true,
      note: true,
      created_at: true,
    },
  });

  if (!approval) {
    throw new HttpException("Refund approval not found", 404);
  }

  return {
    id: approval.id,
    shopping_refund_request_id: approval.shopping_refund_request_id,
    shopping_refund_status_history_id:
      approval.shopping_refund_status_history_id,
    actor_type: approval.actor_type,
    actor_id: approval.shopping_actor_id,
    action: approval.action,
    note: approval.note === null ? undefined : approval.note,
    created_at: toISOStringSafe(approval.created_at),
  };
}
