import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerOrdersOrderIdRefund(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrder.IRefundCreate;
}): Promise<IShoppingMallRefundRequest> {
  const { customer, orderId, body } = props;

  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      id: orderId,
      shopping_mall_customer_id: customer.id,
      deleted_at: null,
    },
  });

  if (!order) {
    throw new HttpException("Order not found or access denied", 404);
  }

  if (order.status !== "delivered" && order.status !== "completed") {
    throw new HttpException(
      "Order must be delivered or completed to request refund",
      400,
    );
  }

  if (!order.delivered_at) {
    throw new HttpException("Order delivery date not available", 400);
  }

  const deliveredTimestamp = new Date(order.delivered_at).getTime();
  const currentTimestamp = Date.now();
  const daysSinceDelivery = Math.floor(
    (currentTimestamp - deliveredTimestamp) / (1000 * 60 * 60 * 24),
  );

  if (daysSinceDelivery > 30) {
    throw new HttpException(
      "Refund request must be submitted within 30 days of delivery",
      400,
    );
  }

  const requestedAtTimestamp = Date.now();
  const sellerResponseDeadlineTimestamp =
    requestedAtTimestamp + 3 * 24 * 60 * 60 * 1000;

  const requestedAtString = toISOStringSafe(new Date(requestedAtTimestamp));
  const sellerResponseDeadlineString = toISOStringSafe(
    new Date(sellerResponseDeadlineTimestamp),
  );

  const refundRequest =
    await MyGlobal.prisma.shopping_mall_refund_requests.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shopping_mall_order_id: orderId,
        shopping_mall_customer_id: customer.id,
        reviewer_seller_id: null,
        reviewer_admin_id: null,
        refund_reason: body.refund_reason,
        refund_description: body.refund_description,
        refund_amount_requested: body.refund_amount_requested,
        refund_amount_approved: null,
        refund_status: "pending_review",
        return_required: false,
        return_tracking_number: null,
        review_notes: null,
        requested_at: requestedAtString,
        seller_response_deadline: sellerResponseDeadlineString,
        reviewed_at: null,
        completed_at: null,
        created_at: requestedAtString,
        updated_at: requestedAtString,
      },
    });

  return {
    id: refundRequest.id as string & tags.Format<"uuid">,
    shopping_mall_order_id: refundRequest.shopping_mall_order_id as string &
      tags.Format<"uuid">,
    shopping_mall_customer_id:
      refundRequest.shopping_mall_customer_id as string & tags.Format<"uuid">,
    reviewer_seller_id: refundRequest.reviewer_seller_id
      ? (refundRequest.reviewer_seller_id as string & tags.Format<"uuid">)
      : undefined,
    reviewer_admin_id: refundRequest.reviewer_admin_id
      ? (refundRequest.reviewer_admin_id as string & tags.Format<"uuid">)
      : undefined,
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
    refund_amount_approved: refundRequest.refund_amount_approved ?? undefined,
    refund_status: refundRequest.refund_status as
      | "pending_review"
      | "pending_seller_response"
      | "approved"
      | "rejected"
      | "processing"
      | "completed",
    return_required: refundRequest.return_required,
    return_tracking_number: refundRequest.return_tracking_number ?? undefined,
    review_notes: refundRequest.review_notes ?? undefined,
    requested_at: toISOStringSafe(refundRequest.requested_at),
    seller_response_deadline: toISOStringSafe(
      refundRequest.seller_response_deadline,
    ),
    reviewed_at: refundRequest.reviewed_at
      ? toISOStringSafe(refundRequest.reviewed_at)
      : undefined,
    completed_at: refundRequest.completed_at
      ? toISOStringSafe(refundRequest.completed_at)
      : undefined,
  };
}
