import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallPaymentSettingsCurrencyConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentSettingsCurrencyConfig";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallPaymentSettingsCurrencyConfigTransformer {
  export type Payload = Prisma.shopping_mall_payment_settingsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        payment_timeout_seconds: true,
        max_retry_attempts: true,
        sla_threshold_minutes: true,
        disable_card_payments: true,
        disable_wallet_payments: true,
        disable_crypto_payments: true,
        enable_surcharge: true,
        enable_rate_limiting: true,
        enable_webhooks: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.shopping_mall_payment_settingsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallPaymentSettingsCurrencyConfig> {
    return {
      baseCurrency: "USD",
      supportedCurrencies: [
        "EUR",
        "GBP",
        "CAD",
        "AUD",
        "JPY",
        "CHF",
        "SEK",
        "NOK",
        "DKK",
        "MXN",
        "BRL",
        "INR",
        "CNY",
        "SGD",
        "HKD",
      ],
      exchangeRateSource: "fixer.io",
      rateUpdateInterval: "daily",
      enableDynamicPricing: true,
      currencyDisplayFormat: "symbol-first",
      minimumExchangeRatePrecision: 6,
      fallbackCurrency: "USD",
      autoConvertToCustomerCurrency: true,
      currencyRoundingRule: "nearest",
    };
  }
}
