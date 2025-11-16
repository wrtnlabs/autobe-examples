import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallRefundTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundTransaction";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IShoppingMallPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentTransaction";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminRefundTransactionsRefundTransactionId(props: {
  admin: AdminPayload;
  refundTransactionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallRefundTransaction> {
  const refundTransaction =
    await MyGlobal.prisma.shopping_mall_refund_transactions.findUnique({
      where: {
        id: props.refundTransactionId,
      },
      include: {
        refundRequest: true,
        originalPayment: true,
        order: true,
        buyer: true,
      },
    });

  if (!refundTransaction) {
    throw new HttpException("Refund transaction not found", 404);
  }

  return {
    id: refundTransaction.id,
    shopping_mall_refund_request_id:
      refundTransaction.shopping_mall_refund_request_id,
    refundRequest: {
      id: refundTransaction.refundRequest.id,
      refund_request_number:
        refundTransaction.refundRequest.refund_request_number,
      refund_reason: typia.assert<
        | "defective_product"
        | "not_as_described"
        | "wrong_item"
        | "damaged_in_shipping"
        | "never_arrived"
        | "buyer_changed_mind"
        | "other"
      >(refundTransaction.refundRequest.refund_reason),
      requested_amount: refundTransaction.refundRequest.requested_amount,
      status: typia.assert<
        | "requested"
        | "under_review"
        | "information_requested"
        | "approved"
        | "processing"
        | "completed"
        | "denied"
        | "cancelled"
      >(refundTransaction.refundRequest.status),
      requested_at: toISOStringSafe(
        refundTransaction.refundRequest.requested_at,
      ),
      shopping_mall_order_id:
        refundTransaction.refundRequest.shopping_mall_order_id,
      shopping_mall_order_seller_id:
        refundTransaction.refundRequest.shopping_mall_order_seller_id === null
          ? undefined
          : refundTransaction.refundRequest.shopping_mall_order_seller_id,
      shopping_mall_buyer_id:
        refundTransaction.refundRequest.shopping_mall_buyer_id,
      refund_explanation: refundTransaction.refundRequest.refund_explanation,
      admin_decision:
        refundTransaction.refundRequest.admin_decision === null
          ? undefined
          : typia.assert<
              | "approve_full"
              | "approve_partial"
              | "deny"
              | "escalate"
              | "pending"
            >(refundTransaction.refundRequest.admin_decision),
      approved_refund_amount:
        refundTransaction.refundRequest.approved_refund_amount === null
          ? undefined
          : refundTransaction.refundRequest.approved_refund_amount,
      reviewed_at:
        refundTransaction.refundRequest.reviewed_at === null
          ? undefined
          : toISOStringSafe(refundTransaction.refundRequest.reviewed_at),
    },
    shopping_mall_payment_transaction_id:
      refundTransaction.shopping_mall_payment_transaction_id,
    originalPayment: {
      id: refundTransaction.originalPayment.id,
      transaction_type: typia.assert<
        "authorization" | "capture" | "void" | "refund"
      >(refundTransaction.originalPayment.transaction_type),
      amount: refundTransaction.originalPayment.amount,
      currency: refundTransaction.originalPayment.currency,
      status: typia.assert<
        "pending" | "authorized" | "captured" | "failed" | "voided" | "refunded"
      >(refundTransaction.originalPayment.status),
      provider: refundTransaction.originalPayment.provider,
      created_at: toISOStringSafe(refundTransaction.originalPayment.created_at),
    },
    shopping_mall_order_id: refundTransaction.shopping_mall_order_id,
    order: {
      id: refundTransaction.order.id,
      order_number: refundTransaction.order.order_number,
      status: refundTransaction.order.status,
      subtotal: refundTransaction.order.subtotal,
      shipping_total: refundTransaction.order.shipping_total,
      tax_total: refundTransaction.order.tax_total,
      discount_total: refundTransaction.order.discount_total,
      total_amount: refundTransaction.order.total_amount,
      estimated_delivery_start:
        refundTransaction.order.estimated_delivery_start === null
          ? undefined
          : toISOStringSafe(refundTransaction.order.estimated_delivery_start),
      estimated_delivery_end:
        refundTransaction.order.estimated_delivery_end === null
          ? undefined
          : toISOStringSafe(refundTransaction.order.estimated_delivery_end),
      actual_delivery_at:
        refundTransaction.order.actual_delivery_at === null
          ? undefined
          : toISOStringSafe(refundTransaction.order.actual_delivery_at),
      cancelled_at:
        refundTransaction.order.cancelled_at === null
          ? undefined
          : toISOStringSafe(refundTransaction.order.cancelled_at),
      completed_at:
        refundTransaction.order.completed_at === null
          ? undefined
          : toISOStringSafe(refundTransaction.order.completed_at),
      created_at: toISOStringSafe(refundTransaction.order.created_at),
      updated_at: toISOStringSafe(refundTransaction.order.updated_at),
    },
    shopping_mall_buyer_id: refundTransaction.shopping_mall_buyer_id,
    buyer: {
      id: refundTransaction.buyer.id,
      email: refundTransaction.buyer.email,
      full_name: refundTransaction.buyer.full_name,
      phone_number:
        refundTransaction.buyer.phone_number === null
          ? undefined
          : refundTransaction.buyer.phone_number,
    },
    refund_amount: refundTransaction.refund_amount,
    currency: refundTransaction.currency,
    status: typia.assert<"processing" | "completed" | "failed">(
      refundTransaction.status,
    ),
    provider: refundTransaction.provider,
    provider_refund_id:
      refundTransaction.provider_refund_id === null
        ? undefined
        : refundTransaction.provider_refund_id,
    provider_response:
      refundTransaction.provider_response === null
        ? undefined
        : refundTransaction.provider_response,
    failure_reason:
      refundTransaction.failure_reason === null
        ? undefined
        : refundTransaction.failure_reason,
    initiated_at: toISOStringSafe(refundTransaction.initiated_at),
    completed_at:
      refundTransaction.completed_at === null
        ? undefined
        : toISOStringSafe(refundTransaction.completed_at),
    created_at: toISOStringSafe(refundTransaction.created_at),
  };
}
