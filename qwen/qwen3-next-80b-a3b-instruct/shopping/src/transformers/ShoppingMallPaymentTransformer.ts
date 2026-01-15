import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallPaymentTransformer {
  export type Payload = Prisma.shopping_mall_paymentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        amount: true,
        currency: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        paymentIntent: true,
        shopping_mall_payment_refunds: true,
        shopping_mall_payment_reconciliation: true,
        shopping_mall_payment_disputes: true,
        shopping_mall_payment_cryptocurrency_conversions: true,
      },
    } satisfies Prisma.shopping_mall_paymentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallPayment> {
    return {
      id: input.id,
      order_id: null,
      payment_method_id: null,
      amount: input.amount,
      currency: input.currency,
      status: input.status as
        | "pending"
        | "refunded"
        | "failed"
        | "succeeded"
        | "canceled"
        | "partially_refunded",
      gateway_transaction_id: null,
      gateway_payment_response: null,
      gateway_payment_reason: null,
      created_at: toISOStringSafe(input.created_at),
    };
  }
}
