import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminRefundRequestsRefundRequestId(props: {
  admin: AdminPayload;
  refundRequestId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallRefundRequest> {
  const refundRequest =
    await MyGlobal.prisma.shopping_mall_refund_requests.findUnique({
      where: {
        id: props.refundRequestId,
      },
      include: {
        order: true,
        buyer: true,
        reviewedByAdmin: true,
      },
    });

  if (!refundRequest) {
    throw new HttpException("Refund request not found", 404);
  }

  return {
    id: refundRequest.id,
    shopping_mall_order_id: refundRequest.shopping_mall_order_id,
    shopping_mall_order_seller_id:
      refundRequest.shopping_mall_order_seller_id ?? undefined,
    shopping_mall_buyer_id: refundRequest.shopping_mall_buyer_id,
    refund_request_number: refundRequest.refund_request_number,
    refund_reason: refundRequest.refund_reason,
    refund_explanation: refundRequest.refund_explanation,
    requested_amount: refundRequest.requested_amount,
    status: refundRequest.status as
      | "requested"
      | "under_review"
      | "information_requested"
      | "approved"
      | "processing"
      | "completed"
      | "denied"
      | "cancelled",
    admin_decision: refundRequest.admin_decision
      ? (refundRequest.admin_decision as
          | "approve_full"
          | "approve_partial"
          | "deny"
          | "escalate"
          | "pending")
      : undefined,
    admin_decision_notes: refundRequest.admin_decision_notes ?? undefined,
    approved_refund_amount: refundRequest.approved_refund_amount ?? undefined,
    return_required: refundRequest.return_required,
    return_tracking_number: refundRequest.return_tracking_number ?? undefined,
    return_received_at: refundRequest.return_received_at
      ? toISOStringSafe(refundRequest.return_received_at)
      : null,
    requested_at: toISOStringSafe(refundRequest.requested_at),
    reviewed_at: refundRequest.reviewed_at
      ? toISOStringSafe(refundRequest.reviewed_at)
      : null,
    approved_at: refundRequest.approved_at
      ? toISOStringSafe(refundRequest.approved_at)
      : null,
    denied_at: refundRequest.denied_at
      ? toISOStringSafe(refundRequest.denied_at)
      : null,
    completed_at: refundRequest.completed_at
      ? toISOStringSafe(refundRequest.completed_at)
      : null,
    reviewed_by_admin_id: refundRequest.reviewed_by_admin_id ?? undefined,
    created_at: toISOStringSafe(refundRequest.created_at),
    updated_at: toISOStringSafe(refundRequest.updated_at),
    deleted_at: refundRequest.deleted_at
      ? toISOStringSafe(refundRequest.deleted_at)
      : null,
    order: {
      id: refundRequest.order.id,
      order_number: refundRequest.order.order_number,
      status: refundRequest.order.status,
      subtotal: refundRequest.order.subtotal,
      shipping_total: refundRequest.order.shipping_total,
      tax_total: refundRequest.order.tax_total,
      discount_total: refundRequest.order.discount_total,
      total_amount: refundRequest.order.total_amount,
      estimated_delivery_start: refundRequest.order.estimated_delivery_start
        ? toISOStringSafe(refundRequest.order.estimated_delivery_start)
        : undefined,
      estimated_delivery_end: refundRequest.order.estimated_delivery_end
        ? toISOStringSafe(refundRequest.order.estimated_delivery_end)
        : undefined,
      actual_delivery_at: refundRequest.order.actual_delivery_at
        ? toISOStringSafe(refundRequest.order.actual_delivery_at)
        : undefined,
      cancelled_at: refundRequest.order.cancelled_at
        ? toISOStringSafe(refundRequest.order.cancelled_at)
        : undefined,
      completed_at: refundRequest.order.completed_at
        ? toISOStringSafe(refundRequest.order.completed_at)
        : undefined,
      created_at: toISOStringSafe(refundRequest.order.created_at),
      updated_at: toISOStringSafe(refundRequest.order.updated_at),
    },
    buyer: {
      id: refundRequest.buyer.id,
      email: refundRequest.buyer.email,
      full_name: refundRequest.buyer.full_name,
      phone_number: refundRequest.buyer.phone_number ?? undefined,
    },
    reviewed_by_admin: refundRequest.reviewedByAdmin
      ? {
          id: refundRequest.reviewedByAdmin.id,
          email: refundRequest.reviewedByAdmin.email,
          full_name: refundRequest.reviewedByAdmin.full_name,
          phone_number: refundRequest.reviewedByAdmin.phone_number,
          admin_level: refundRequest.reviewedByAdmin.admin_level as
            | "super_admin"
            | "moderator"
            | "support",
          email_verified: refundRequest.reviewedByAdmin.email_verified,
          created_at: toISOStringSafe(refundRequest.reviewedByAdmin.created_at),
          updated_at: toISOStringSafe(refundRequest.reviewedByAdmin.updated_at),
          deleted_at: refundRequest.reviewedByAdmin.deleted_at
            ? toISOStringSafe(refundRequest.reviewedByAdmin.deleted_at)
            : null,
        }
      : undefined,
  };
}
