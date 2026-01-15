import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallPaymentExchangeRate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentExchangeRate";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallPaymentExchangeRateTransformer {
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
  ): Promise<IShoppingMallPaymentExchangeRate> {
    return {
      id: input.id,
      source_currency_code: input.from_currency,
      target_currency_code: input.to_currency,
      exchange_rate: input.exchange_rate,
      effective_from: input.locked_at.toISOString(),
      effective_until: input.locked_at.toISOString(),
      is_active: input.source_api ? true : false,
      notes: input.source_api ?? undefined,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
