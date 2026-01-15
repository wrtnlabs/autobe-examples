import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallPaymentIntent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentIntent";
import { IShoppingMallPaymentIntentMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentIntentMetadata";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallPaymentIntentTransformer {
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
        created_at: true,
        updated_at: true,
        cart: {
          select: {
            id: true,
          },
        },
        paymentMethod: {
          select: {
            id: true,
          },
        },
        customer: {
          select: {
            id: true,
          },
        },
        shopping_mall_payments: {
          select: {
            id: true,
          },
        },
        shopping_mall_payment_audit_logs: {
          select: {
            id: true,
          },
        },
        shopping_mall_payment_gateway_logs: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_payment_intentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallPaymentIntent> {
    return {
      id: input.id,
      amount: input.amount,
      currency: input.currency,
      status: typia.assert<
        | "expired"
        | "processing"
        | "cancelled"
        | "created"
        | "authorized"
        | "captured"
        | "failed"
      >(input.status),
      payment_method_id: input.paymentMethod?.id || input.cart?.id,
      payment_gateway:
        input.shopping_mall_payments?.[0]?.id || input.payment_gateway,
      metadata:
        input.shopping_mall_payment_audit_logs?.[0]?.id || input.metadata,
      client_ip: input.customer?.id || input.client_ip,
      user_agent: input.customer?.id || input.user_agent,
      webhook_url: input.webhook_url,
      contract_id: input.contract_id,
      channel_id: input.channel_id,
    };
  }
}
