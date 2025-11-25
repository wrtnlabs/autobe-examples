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

export async function putShoppingMallAdminRefundRequestsRefundRequestId(props: {
  admin: AdminPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IShoppingMallRefundRequest.IUpdate;
}): Promise<IShoppingMallRefundRequest> {
  const existing =
    await MyGlobal.prisma.shopping_mall_refund_requests.findUnique({
      where: { id: props.refundRequestId },
    });

  if (!existing || existing.deleted_at !== null) {
    throw new HttpException("Refund request not found", 404);
  }

  const now = new Date();
  const isApproved = props.body.status === "approved";
  const isDenied = props.body.status === "denied";

  const updated = await MyGlobal.prisma.shopping_mall_refund_requests.update({
    where: { id: props.refundRequestId },
    data: {
      status: props.body.status,
      ...(props.body.admin_decision !== undefined && {
        admin_decision: props.body.admin_decision,
      }),
      ...(props.body.admin_decision_notes !== undefined && {
        admin_decision_notes: props.body.admin_decision_notes,
      }),
      ...(props.body.approved_refund_amount !== undefined && {
        approved_refund_amount: props.body.approved_refund_amount,
      }),
      ...(props.body.return_required !== undefined && {
        return_required: props.body.return_required,
      }),
      ...(props.body.return_tracking_number !== undefined && {
        return_tracking_number: props.body.return_tracking_number,
      }),
      reviewed_by_admin_id: props.admin.id,
      reviewed_at: now,
      ...(isApproved && { approved_at: now }),
      ...(isDenied && { denied_at: now }),
      updated_at: now,
    },
    include: {
      order: true,
      buyer: true,
      reviewedByAdmin: true,
    },
  });

  return {
    id: updated.id,
    shopping_mall_order_id: updated.shopping_mall_order_id,
    shopping_mall_order_seller_id:
      updated.shopping_mall_order_seller_id === null
        ? null
        : updated.shopping_mall_order_seller_id,
    shopping_mall_buyer_id: updated.shopping_mall_buyer_id,
    refund_request_number: updated.refund_request_number,
    refund_reason: updated.refund_reason,
    refund_explanation: updated.refund_explanation,
    requested_amount: updated.requested_amount,
    status: updated.status as
      | "requested"
      | "under_review"
      | "information_requested"
      | "approved"
      | "processing"
      | "completed"
      | "denied"
      | "cancelled",
    admin_decision:
      updated.admin_decision === null
        ? null
        : (updated.admin_decision as
            | "approve_full"
            | "approve_partial"
            | "deny"
            | "escalate"
            | "pending"),
    admin_decision_notes:
      updated.admin_decision_notes === null
        ? null
        : updated.admin_decision_notes,
    approved_refund_amount:
      updated.approved_refund_amount === null
        ? null
        : updated.approved_refund_amount,
    return_required: updated.return_required,
    return_tracking_number:
      updated.return_tracking_number === null
        ? null
        : updated.return_tracking_number,
    return_received_at:
      updated.return_received_at === null
        ? null
        : toISOStringSafe(updated.return_received_at),
    requested_at: toISOStringSafe(updated.requested_at),
    reviewed_at:
      updated.reviewed_at === null
        ? null
        : toISOStringSafe(updated.reviewed_at),
    approved_at:
      updated.approved_at === null
        ? null
        : toISOStringSafe(updated.approved_at),
    denied_at:
      updated.denied_at === null ? null : toISOStringSafe(updated.denied_at),
    completed_at:
      updated.completed_at === null
        ? null
        : toISOStringSafe(updated.completed_at),
    reviewed_by_admin_id:
      updated.reviewed_by_admin_id === null
        ? null
        : updated.reviewed_by_admin_id,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null ? null : toISOStringSafe(updated.deleted_at),
    order: {
      id: updated.order.id,
      order_number: updated.order.order_number,
      status: updated.order.status,
      subtotal: updated.order.subtotal,
      shipping_total: updated.order.shipping_total,
      tax_total: updated.order.tax_total,
      discount_total: updated.order.discount_total,
      total_amount: updated.order.total_amount,
      estimated_delivery_start:
        updated.order.estimated_delivery_start === null
          ? null
          : toISOStringSafe(updated.order.estimated_delivery_start),
      estimated_delivery_end:
        updated.order.estimated_delivery_end === null
          ? null
          : toISOStringSafe(updated.order.estimated_delivery_end),
      actual_delivery_at:
        updated.order.actual_delivery_at === null
          ? null
          : toISOStringSafe(updated.order.actual_delivery_at),
      cancelled_at:
        updated.order.cancelled_at === null
          ? null
          : toISOStringSafe(updated.order.cancelled_at),
      completed_at:
        updated.order.completed_at === null
          ? null
          : toISOStringSafe(updated.order.completed_at),
      created_at: toISOStringSafe(updated.order.created_at),
      updated_at: toISOStringSafe(updated.order.updated_at),
    },
    buyer: {
      id: updated.buyer.id,
      email: updated.buyer.email,
      full_name: updated.buyer.full_name,
      phone_number:
        updated.buyer.phone_number === null ? null : updated.buyer.phone_number,
    },
    reviewed_by_admin: updated.reviewedByAdmin
      ? {
          id: updated.reviewedByAdmin.id,
          email: updated.reviewedByAdmin.email,
          full_name: updated.reviewedByAdmin.full_name,
          phone_number: updated.reviewedByAdmin.phone_number,
          admin_level: updated.reviewedByAdmin.admin_level as
            | "super_admin"
            | "moderator"
            | "support",
          email_verified: updated.reviewedByAdmin.email_verified,
          created_at: toISOStringSafe(updated.reviewedByAdmin.created_at),
          updated_at: toISOStringSafe(updated.reviewedByAdmin.updated_at),
          deleted_at:
            updated.reviewedByAdmin.deleted_at === null
              ? null
              : toISOStringSafe(updated.reviewedByAdmin.deleted_at),
        }
      : null,
  };
}
