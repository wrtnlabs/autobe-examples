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
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

export async function postShoppingMallBuyerRefundRequests(props: {
  buyer: BuyerPayload;
  body: IShoppingMallRefundRequest.ICreate;
}): Promise<IShoppingMallRefundRequest> {
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: props.body.shopping_mall_order_id },
  });

  if (!order) {
    throw new HttpException("Order not found", 404);
  }

  if (order.shopping_mall_buyer_id !== props.buyer.id) {
    throw new HttpException("Forbidden", 403);
  }

  if (order.status !== "delivered") {
    throw new HttpException(
      "Order must be delivered before requesting refund",
      400,
    );
  }

  if (props.body.requested_amount > order.total_amount) {
    throw new HttpException("Requested amount cannot exceed order total", 400);
  }

  if (props.body.shopping_mall_order_seller_id) {
    const orderSeller =
      await MyGlobal.prisma.shopping_mall_order_sellers.findUnique({
        where: { id: props.body.shopping_mall_order_seller_id },
      });

    if (
      !orderSeller ||
      orderSeller.shopping_mall_order_id !== props.body.shopping_mall_order_id
    ) {
      throw new HttpException("Invalid seller sub-order", 400);
    }
  }

  const now = new Date();
  const dateStr = now.toISOString().split("T")[0].replace(/-/g, "");
  const randomNum = Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(6, "0");
  const refundRequestNumber = `REF-${dateStr}-${randomNum}`;

  const created = await MyGlobal.prisma.shopping_mall_refund_requests.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_order_id: props.body.shopping_mall_order_id,
      shopping_mall_order_seller_id:
        props.body.shopping_mall_order_seller_id ?? null,
      shopping_mall_buyer_id: props.buyer.id,
      refund_request_number: refundRequestNumber,
      refund_reason: props.body.refund_reason,
      refund_explanation: props.body.refund_explanation,
      requested_amount: props.body.requested_amount,
      status: "requested",
      admin_decision: null,
      admin_decision_notes: null,
      approved_refund_amount: null,
      return_required: props.body.return_required,
      return_tracking_number: null,
      return_received_at: null,
      requested_at: now,
      reviewed_at: null,
      approved_at: null,
      denied_at: null,
      completed_at: null,
      reviewed_by_admin_id: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    include: {
      order: true,
      buyer: true,
      reviewedByAdmin: true,
    },
  });

  return {
    id: created.id,
    shopping_mall_order_id: created.shopping_mall_order_id,
    shopping_mall_order_seller_id:
      created.shopping_mall_order_seller_id ?? undefined,
    shopping_mall_buyer_id: created.shopping_mall_buyer_id,
    refund_request_number: created.refund_request_number,
    refund_reason: created.refund_reason,
    refund_explanation: created.refund_explanation,
    requested_amount: created.requested_amount,
    status: created.status as
      | "requested"
      | "under_review"
      | "information_requested"
      | "approved"
      | "processing"
      | "completed"
      | "denied"
      | "cancelled",
    admin_decision: created.admin_decision
      ? (created.admin_decision as
          | "approve_full"
          | "approve_partial"
          | "deny"
          | "escalate"
          | "pending")
      : undefined,
    admin_decision_notes: created.admin_decision_notes ?? undefined,
    approved_refund_amount: created.approved_refund_amount ?? undefined,
    return_required: created.return_required,
    return_tracking_number: created.return_tracking_number ?? undefined,
    return_received_at: created.return_received_at
      ? toISOStringSafe(created.return_received_at)
      : undefined,
    requested_at: toISOStringSafe(created.requested_at),
    reviewed_at: created.reviewed_at
      ? toISOStringSafe(created.reviewed_at)
      : undefined,
    approved_at: created.approved_at
      ? toISOStringSafe(created.approved_at)
      : undefined,
    denied_at: created.denied_at
      ? toISOStringSafe(created.denied_at)
      : undefined,
    completed_at: created.completed_at
      ? toISOStringSafe(created.completed_at)
      : undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
    order: {
      id: created.order.id,
      order_number: created.order.order_number,
      status: created.order.status,
      subtotal: created.order.subtotal,
      shipping_total: created.order.shipping_total,
      tax_total: created.order.tax_total,
      discount_total: created.order.discount_total,
      total_amount: created.order.total_amount,
      estimated_delivery_start: created.order.estimated_delivery_start
        ? toISOStringSafe(created.order.estimated_delivery_start)
        : undefined,
      estimated_delivery_end: created.order.estimated_delivery_end
        ? toISOStringSafe(created.order.estimated_delivery_end)
        : undefined,
      actual_delivery_at: created.order.actual_delivery_at
        ? toISOStringSafe(created.order.actual_delivery_at)
        : undefined,
      cancelled_at: created.order.cancelled_at
        ? toISOStringSafe(created.order.cancelled_at)
        : undefined,
      completed_at: created.order.completed_at
        ? toISOStringSafe(created.order.completed_at)
        : undefined,
      created_at: toISOStringSafe(created.order.created_at),
      updated_at: toISOStringSafe(created.order.updated_at),
    },
    buyer: {
      id: created.buyer.id,
      email: created.buyer.email,
      full_name: created.buyer.full_name,
      phone_number: created.buyer.phone_number ?? undefined,
    },
    reviewed_by_admin: created.reviewedByAdmin
      ? {
          id: created.reviewedByAdmin.id,
          email: created.reviewedByAdmin.email,
          full_name: created.reviewedByAdmin.full_name,
          phone_number: created.reviewedByAdmin.phone_number,
          admin_level: created.reviewedByAdmin.admin_level as
            | "super_admin"
            | "moderator"
            | "support",
          email_verified: created.reviewedByAdmin.email_verified,
          created_at: toISOStringSafe(created.reviewedByAdmin.created_at),
          updated_at: toISOStringSafe(created.reviewedByAdmin.updated_at),
          deleted_at: created.reviewedByAdmin.deleted_at
            ? toISOStringSafe(created.reviewedByAdmin.deleted_at)
            : null,
        }
      : undefined,
  };
}
