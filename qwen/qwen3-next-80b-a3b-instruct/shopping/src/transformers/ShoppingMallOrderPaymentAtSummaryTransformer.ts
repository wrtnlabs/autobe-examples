import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPayment";
import { IShoppingMallOrderPaymentPaymentDetails } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentPaymentDetails";
import { IShoppingMallOrderPaymentMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMetadata";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallOrderPaymentAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_order_paymentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        payment_method: true,
        status: true,
        amount: true,
        gateway_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        order: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_order_paymentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderPayment.ISummary> {
    return {
      id: input.id,
      order_id: input.order.id,
      payment_intent_id: input.payment_intent_id,
      amount: Number(input.amount),
      currency: input.currency,
      status: input.status,
      payment_method: input.payment_method,
      gateway: input.gateway_id,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      refund_amount: input.refund_amount ?? null,
      refund_count: input.refund_count ?? null,
      is_chargeback: input.is_chargeback ?? null,
      dispute_id: input.dispute_id ?? null,
      ip_address: input.ip_address ?? null,
      user_agent: input.user_agent ?? null,
      payment_region: input.payment_region ?? null,
      fraud_score: input.fraud_score ?? null,
      payment_channel: input.payment_channel ?? null,
      merchant_id: input.merchant_id ?? null,
      fee_amount: input.fee_amount ?? null,
      payment_details: input.payment_details ?? null,
      payment_status_message: input.payment_status_message ?? null,
      external_reference: input.external_reference ?? null,
      metadata: input.metadata ?? null,
      payment_source: input.payment_source ?? null,
      gateway_reference_id: input.gateway_reference_id,
    };
  }
}
