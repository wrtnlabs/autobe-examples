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

export async function putShoppingMallAdminRefundRequestsRefundRequestId(props: {
  admin: AdminPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IShoppingMallRefundRequest.IUpdate;
}): Promise<IShoppingMallRefundRequest> {
  const { admin, refundRequestId, body } = props;

  await MyGlobal.prisma.shopping_mall_refund_requests.findUniqueOrThrow({
    where: { id: refundRequestId },
  });

  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.shopping_mall_refund_requests.update({
    where: { id: refundRequestId },
    data: {
      refund_status: body.refund_status ?? undefined,
      reviewer_admin_id: admin.id,
      reviewed_at: body.refund_status !== undefined ? now : undefined,
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    shopping_mall_order_id: updated.shopping_mall_order_id,
    shopping_mall_customer_id: updated.shopping_mall_customer_id,
    reviewer_seller_id: updated.reviewer_seller_id ?? undefined,
    reviewer_admin_id: updated.reviewer_admin_id ?? undefined,
    refund_reason: updated.refund_reason as
      | "defective_damaged"
      | "wrong_item"
      | "does_not_match_description"
      | "changed_mind"
      | "found_better_price"
      | "quality_not_expected"
      | "other",
    refund_description: updated.refund_description,
    refund_amount_requested: updated.refund_amount_requested,
    refund_amount_approved: updated.refund_amount_approved ?? undefined,
    refund_status: updated.refund_status as
      | "pending_review"
      | "pending_seller_response"
      | "approved"
      | "rejected"
      | "processing"
      | "completed",
    return_required: updated.return_required,
    return_tracking_number: updated.return_tracking_number ?? undefined,
    review_notes: updated.review_notes ?? undefined,
    requested_at: toISOStringSafe(updated.requested_at),
    seller_response_deadline: toISOStringSafe(updated.seller_response_deadline),
    reviewed_at: updated.reviewed_at
      ? toISOStringSafe(updated.reviewed_at)
      : undefined,
    completed_at: updated.completed_at
      ? toISOStringSafe(updated.completed_at)
      : undefined,
  };
}
