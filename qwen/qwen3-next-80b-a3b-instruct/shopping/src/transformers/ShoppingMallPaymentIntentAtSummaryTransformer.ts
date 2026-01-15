import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallPaymentIntent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentIntent";
import { IShoppingMallPaymentIntentMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentIntentMetadata";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallPaymentIntentAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_payment_intentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        intent_id: true,
        currency: true,
        amount: true,
        status: true,
        cart: true,
        paymentMethod: true,
        customer: true,
        shopping_mall_payments: true,
        shopping_mall_payment_audit_logs: true,
        shopping_mall_payment_gateway_logs: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.shopping_mall_payment_intentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallPaymentIntent.ISummary> {
    return {
      id: input.id,
      amount: input.amount,
      currency: input.currency,
      status: input.status as "pending" | "failed" | "succeeded" | "canceled",
      external_reference: input.intent_id,
      payment_method_type: input.paymentMethod.type,
      metadata: undefined,
    };
  }
}
