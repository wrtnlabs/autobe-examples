import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallPaymentExchangeRate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentExchangeRate";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallPaymentExchangeRateAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_payment_exchange_ratesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        from_currency: true,
        to_currency: true,
        exchange_rate: true,
        source_api: true,
        locked_at: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.shopping_mall_payment_exchange_ratesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallPaymentExchangeRate.ISummary> {
    const currencyPair = `${input.from_currency}/${input.to_currency}`;
    return {
      id: input.id,
      source_currency: input.from_currency,
      target_currency: input.to_currency,
      exchange_rate: input.exchange_rate,
      effective_date: input.locked_at.toISOString().split("T")[0], // Convert to ISO date format
      source_system: input.source_api,
      created_at: input.created_at.toISOString(),
      last_updated: input.updated_at.toISOString(),
      is_active: true, // Business rule: all stored exchange rates are active
      currency_pair: currencyPair,
      rate_source: undefined, // Field does not exist in database schema
      notice: undefined, // Field does not exist in database schema
    };
  }
}
