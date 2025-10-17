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

export async function getShoppingMallAdminRefundRequestsRefundRequestId(props: {
  admin: AdminPayload;
  refundRequestId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallRefundRequest> {
  const { refundRequestId } = props;

  const refundRequest =
    await MyGlobal.prisma.shopping_mall_refund_requests.findUniqueOrThrow({
      where: { id: refundRequestId },
    });

  return {
    id: refundRequest.id as string & tags.Format<"uuid">,
    shopping_mall_order_id: refundRequest.shopping_mall_order_id as string &
      tags.Format<"uuid">,
    shopping_mall_customer_id:
      refundRequest.shopping_mall_customer_id as string & tags.Format<"uuid">,
    reviewer_seller_id:
      refundRequest.reviewer_seller_id === null
        ? null
        : (refundRequest.reviewer_seller_id as string & tags.Format<"uuid">),
    reviewer_admin_id:
      refundRequest.reviewer_admin_id === null
        ? null
        : (refundRequest.reviewer_admin_id as string & tags.Format<"uuid">),
    refund_reason: refundRequest.refund_reason as
      | "defective_damaged"
      | "wrong_item"
      | "does_not_match_description"
      | "changed_mind"
      | "found_better_price"
      | "quality_not_expected"
      | "other",
    refund_description: refundRequest.refund_description,
    refund_amount_requested: refundRequest.refund_amount_requested,
    refund_amount_approved: refundRequest.refund_amount_approved,
    refund_status: refundRequest.refund_status as
      | "pending_review"
      | "pending_seller_response"
      | "approved"
      | "rejected"
      | "processing"
      | "completed",
    return_required: refundRequest.return_required,
    return_tracking_number: refundRequest.return_tracking_number,
    review_notes: refundRequest.review_notes,
    requested_at: toISOStringSafe(refundRequest.requested_at),
    seller_response_deadline: toISOStringSafe(
      refundRequest.seller_response_deadline,
    ),
    reviewed_at: refundRequest.reviewed_at
      ? toISOStringSafe(refundRequest.reviewed_at)
      : null,
    completed_at: refundRequest.completed_at
      ? toISOStringSafe(refundRequest.completed_at)
      : null,
  };
}
