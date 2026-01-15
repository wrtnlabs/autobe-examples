import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallPaymentRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentRefund";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallPaymentRefundTransformer {
  export type Payload = Prisma.shopping_mall_payment_refundsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        refund_amount: true,
        refund_status: true,
        gateway_response_code: true,
        gateway_response_message: true,
        created_at: true,
        refund_items: true,
        deleted_at: true,
        payment: {
          select: {
            id: true,
            payment_order_id: true,
            payment_customer_id: true,
            payment_seller_id: true,
            payment_refund_method: true,
          },
        },
        shopping_mall_payment_audit_logs: {
          select: {
            id: true,
            event_type: true,
            created_at: true,
            message: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_payment_refundsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallPaymentRefund> {
    return {
      id: input.id,
      payment_id: input.payment.id,
      order_id: input.payment.payment_order_id,
      amount: input.refund_amount,
      reason:
        input.refund_status === "failed"
          ? "customer_requested"
          : "item_not_as_described",
      status: input.refund_status as "pending" | "failed" | "processed",
      customer_id: input.payment.payment_customer_id,
      seller_id: input.payment.payment_seller_id,
      refund_method: input.payment.payment_refund_method,
      refund_reference: input.gateway_response_code ?? undefined,
      comment: input.gateway_response_message ?? undefined,
      created_at: toISOStringSafe(input.created_at),
      failed_reason: input.gateway_response_message ?? undefined,
    };
  }
}
