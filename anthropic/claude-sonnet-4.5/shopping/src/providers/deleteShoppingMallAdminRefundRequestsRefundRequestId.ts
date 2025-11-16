import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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

export async function deleteShoppingMallAdminRefundRequestsRefundRequestId(props: {
  admin: AdminPayload;
  refundRequestId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallRefundRequest> {
  const refundRequest =
    await MyGlobal.prisma.shopping_mall_refund_requests.findUnique({
      where: { id: props.refundRequestId },
      include: {
        buyer: true,
        order: true,
        reviewedByAdmin: true,
      },
    });

  if (!refundRequest) {
    throw new HttpException("Refund request not found", 404);
  }

  if (
    refundRequest.status === "approved" ||
    refundRequest.status === "completed"
  ) {
    throw new HttpException(
      "Cannot delete approved or completed refund requests",
      400,
    );
  }

  const deleted = await MyGlobal.prisma.shopping_mall_refund_requests.delete({
    where: { id: props.refundRequestId },
    include: {
      buyer: true,
      order: true,
      reviewedByAdmin: true,
    },
  });

  return {
    id: deleted.id,
    shopping_mall_order_id: deleted.shopping_mall_order_id,
    shopping_mall_order_seller_id:
      deleted.shopping_mall_order_seller_id ?? undefined,
    shopping_mall_buyer_id: deleted.shopping_mall_buyer_id,
    refund_request_number: deleted.refund_request_number,
    refund_reason: deleted.refund_reason,
    refund_explanation: deleted.refund_explanation,
    requested_amount: deleted.requested_amount,
    status: deleted.status as
      | "requested"
      | "under_review"
      | "information_requested"
      | "approved"
      | "processing"
      | "completed"
      | "denied"
      | "cancelled",
    admin_decision: (deleted.admin_decision ?? undefined) as
      | "approve_full"
      | "approve_partial"
      | "deny"
      | "escalate"
      | "pending"
      | null
      | undefined,
    admin_decision_notes: deleted.admin_decision_notes ?? undefined,
    approved_refund_amount: deleted.approved_refund_amount ?? undefined,
    return_required: deleted.return_required,
    return_tracking_number: deleted.return_tracking_number ?? undefined,
    return_received_at: deleted.return_received_at
      ? toISOStringSafe(deleted.return_received_at)
      : undefined,
    requested_at: toISOStringSafe(deleted.requested_at),
    reviewed_at: deleted.reviewed_at
      ? toISOStringSafe(deleted.reviewed_at)
      : undefined,
    approved_at: deleted.approved_at
      ? toISOStringSafe(deleted.approved_at)
      : undefined,
    denied_at: deleted.denied_at
      ? toISOStringSafe(deleted.denied_at)
      : undefined,
    completed_at: deleted.completed_at
      ? toISOStringSafe(deleted.completed_at)
      : undefined,
    reviewed_by_admin_id: deleted.reviewed_by_admin_id ?? undefined,
    created_at: toISOStringSafe(deleted.created_at),
    updated_at: toISOStringSafe(deleted.updated_at),
    deleted_at: deleted.deleted_at ? toISOStringSafe(deleted.deleted_at) : null,
    order: {
      id: deleted.order.id,
      order_number: deleted.order.order_number,
      status: deleted.order.status,
      subtotal: deleted.order.subtotal,
      shipping_total: deleted.order.shipping_total,
      tax_total: deleted.order.tax_total,
      discount_total: deleted.order.discount_total,
      total_amount: deleted.order.total_amount,
      estimated_delivery_start: deleted.order.estimated_delivery_start
        ? toISOStringSafe(deleted.order.estimated_delivery_start)
        : undefined,
      estimated_delivery_end: deleted.order.estimated_delivery_end
        ? toISOStringSafe(deleted.order.estimated_delivery_end)
        : undefined,
      actual_delivery_at: deleted.order.actual_delivery_at
        ? toISOStringSafe(deleted.order.actual_delivery_at)
        : undefined,
      cancelled_at: deleted.order.cancelled_at
        ? toISOStringSafe(deleted.order.cancelled_at)
        : undefined,
      completed_at: deleted.order.completed_at
        ? toISOStringSafe(deleted.order.completed_at)
        : undefined,
      created_at: toISOStringSafe(deleted.order.created_at),
      updated_at: toISOStringSafe(deleted.order.updated_at),
    },
    buyer: {
      id: deleted.buyer.id,
      email: deleted.buyer.email,
      full_name: deleted.buyer.full_name,
      phone_number: deleted.buyer.phone_number ?? undefined,
    },
    reviewed_by_admin: deleted.reviewedByAdmin
      ? {
          id: deleted.reviewedByAdmin.id,
          email: deleted.reviewedByAdmin.email,
          full_name: deleted.reviewedByAdmin.full_name,
          phone_number: deleted.reviewedByAdmin.phone_number,
          admin_level: deleted.reviewedByAdmin.admin_level as
            | "super_admin"
            | "moderator"
            | "support",
          email_verified: deleted.reviewedByAdmin.email_verified,
          created_at: toISOStringSafe(deleted.reviewedByAdmin.created_at),
          updated_at: toISOStringSafe(deleted.reviewedByAdmin.updated_at),
          deleted_at: deleted.reviewedByAdmin.deleted_at
            ? toISOStringSafe(deleted.reviewedByAdmin.deleted_at)
            : null,
        }
      : undefined,
  };
}
