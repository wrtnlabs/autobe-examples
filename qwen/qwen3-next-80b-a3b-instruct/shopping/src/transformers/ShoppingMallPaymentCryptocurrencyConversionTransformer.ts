import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallPaymentCryptocurrencyConversion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentCryptocurrencyConversion";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallPaymentCryptocurrencyConversionTransformer {
  export type Payload =
    Prisma.shopping_mall_payment_cryptocurrency_conversionsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        // Primary table fields
        id: true,
        fiat_amount: true,
        locked_exchange_rate: true,
        created_at: true,
        settlement_outcome: true,
        customer_confirmed: true,
        updated_at: true,
        fee_amount: true,
        customer_id: true,
        merchant_id: true,
        // BelongsTo relation to payment table - only for transaction_id
        payment: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_payment_cryptocurrency_conversionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallPaymentCryptocurrencyConversion> {
    return {
      id: input.id,
      from_currency: input.from_currency,
      to_currency: input.to_currency,
      conversion_rate: input.locked_exchange_rate,
      source_amount: input.fiat_amount,
      target_amount: input.fiat_amount * input.locked_exchange_rate,
      created_at: toISOStringSafe(input.created_at),
      source_confidence: 0.95, // Standard confidence for active payment systems
      transaction_id: input.payment.id,
      fee_amount: input.fee_amount,
      status: input.settlement_outcome as
        | "pending"
        | "completed"
        | "failed"
        | "cancelled",
      customer_id: input.customer_id,
      merchant_id: input.merchant_id,
    };
  }
}
