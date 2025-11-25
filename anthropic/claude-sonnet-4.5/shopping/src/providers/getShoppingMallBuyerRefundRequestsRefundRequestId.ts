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
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

export async function getShoppingMallBuyerRefundRequestsRefundRequestId(props: {
  buyer: BuyerPayload;
  refundRequestId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallRefundRequest> {
  const refundRequest =
    await MyGlobal.prisma.shopping_mall_refund_requests.findFirst({
      where: {
        id: props.refundRequestId,
        shopping_mall_buyer_id: props.buyer.id,
        deleted_at: null,
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
      refundRequest.shopping_mall_order_seller_id === null
        ? undefined
        : refundRequest.shopping_mall_order_seller_id,
    shopping_mall_buyer_id: refundRequest.shopping_mall_buyer_id,
    refund_request_number: refundRequest.refund_request_number,
    refund_reason: refundRequest.refund_reason,
    refund_explanation: refundRequest.refund_explanation,
    requested_amount: refundRequest.requested_amount,
    status: typia.assert<
      | "requested"
      | "under_review"
      | "information_requested"
      | "approved"
      | "processing"
      | "completed"
      | "denied"
      | "cancelled"
    >(refundRequest.status),
    admin_decision:
      refundRequest.admin_decision === null
        ? undefined
        : typia.assert<
            "approve_full" | "approve_partial" | "deny" | "escalate" | "pending"
          >(refundRequest.admin_decision),
    admin_decision_notes:
      refundRequest.admin_decision_notes === null
        ? undefined
        : refundRequest.admin_decision_notes,
    approved_refund_amount:
      refundRequest.approved_refund_amount === null
        ? undefined
        : refundRequest.approved_refund_amount,
    return_required: refundRequest.return_required,
    return_tracking_number:
      refundRequest.return_tracking_number === null
        ? undefined
        : refundRequest.return_tracking_number,
    return_received_at:
      refundRequest.return_received_at === null
        ? undefined
        : toISOStringSafe(refundRequest.return_received_at),
    requested_at: toISOStringSafe(refundRequest.requested_at),
    reviewed_at:
      refundRequest.reviewed_at === null
        ? undefined
        : toISOStringSafe(refundRequest.reviewed_at),
    approved_at:
      refundRequest.approved_at === null
        ? undefined
        : toISOStringSafe(refundRequest.approved_at),
    denied_at:
      refundRequest.denied_at === null
        ? undefined
        : toISOStringSafe(refundRequest.denied_at),
    completed_at:
      refundRequest.completed_at === null
        ? undefined
        : toISOStringSafe(refundRequest.completed_at),
    reviewed_by_admin_id:
      refundRequest.reviewed_by_admin_id === null
        ? undefined
        : refundRequest.reviewed_by_admin_id,
    created_at: toISOStringSafe(refundRequest.created_at),
    updated_at: toISOStringSafe(refundRequest.updated_at),
    deleted_at:
      refundRequest.deleted_at === null
        ? null
        : toISOStringSafe(refundRequest.deleted_at),
    order: {
      id: refundRequest.order.id,
      order_number: refundRequest.order.order_number,
      status: refundRequest.order.status,
      subtotal: refundRequest.order.subtotal,
      shipping_total: refundRequest.order.shipping_total,
      tax_total: refundRequest.order.tax_total,
      discount_total: refundRequest.order.discount_total,
      total_amount: refundRequest.order.total_amount,
      estimated_delivery_start:
        refundRequest.order.estimated_delivery_start === null
          ? undefined
          : toISOStringSafe(refundRequest.order.estimated_delivery_start),
      estimated_delivery_end:
        refundRequest.order.estimated_delivery_end === null
          ? undefined
          : toISOStringSafe(refundRequest.order.estimated_delivery_end),
      actual_delivery_at:
        refundRequest.order.actual_delivery_at === null
          ? undefined
          : toISOStringSafe(refundRequest.order.actual_delivery_at),
      cancelled_at:
        refundRequest.order.cancelled_at === null
          ? undefined
          : toISOStringSafe(refundRequest.order.cancelled_at),
      completed_at:
        refundRequest.order.completed_at === null
          ? undefined
          : toISOStringSafe(refundRequest.order.completed_at),
      created_at: toISOStringSafe(refundRequest.order.created_at),
      updated_at: toISOStringSafe(refundRequest.order.updated_at),
    },
    buyer: {
      id: refundRequest.buyer.id,
      email: refundRequest.buyer.email,
      full_name: refundRequest.buyer.full_name,
      phone_number:
        refundRequest.buyer.phone_number === null
          ? undefined
          : refundRequest.buyer.phone_number,
    },
    reviewed_by_admin:
      refundRequest.reviewedByAdmin === null
        ? undefined
        : {
            id: refundRequest.reviewedByAdmin.id,
            email: refundRequest.reviewedByAdmin.email,
            full_name: refundRequest.reviewedByAdmin.full_name,
            phone_number: refundRequest.reviewedByAdmin.phone_number,
            admin_level: typia.assert<"super_admin" | "moderator" | "support">(
              refundRequest.reviewedByAdmin.admin_level,
            ),
            email_verified: refundRequest.reviewedByAdmin.email_verified,
            created_at: toISOStringSafe(
              refundRequest.reviewedByAdmin.created_at,
            ),
            updated_at: toISOStringSafe(
              refundRequest.reviewedByAdmin.updated_at,
            ),
            deleted_at:
              refundRequest.reviewedByAdmin.deleted_at === null
                ? null
                : toISOStringSafe(refundRequest.reviewedByAdmin.deleted_at),
          },
  };
}
