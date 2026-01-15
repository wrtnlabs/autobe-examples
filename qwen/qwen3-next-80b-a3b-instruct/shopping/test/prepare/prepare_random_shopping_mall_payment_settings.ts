import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallPaymentSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentSettings";
import { IShoppingMallPaymentSettingsCurrencyConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentSettingsCurrencyConfig";
import { IShoppingMallPaymentSettingsFraudDetection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentSettingsFraudDetection";
import { IShoppingMallPaymentSettingsSecurity } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentSettingsSecurity";
import { IShoppingMallPaymentSettingsPaymentGatewayConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentSettingsPaymentGatewayConfig";
import { IShoppingMallPaymentSettingsPaymentGatewayStripe } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentSettingsPaymentGatewayStripe";
import { IShoppingMallPaymentSettingsPaymentGatewayPayPal } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentSettingsPaymentGatewayPayPal";
import { IShoppingMallPaymentSettingsPaymentGatewaySquare } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentSettingsPaymentGatewaySquare";
import { IShoppingMallPaymentSettingsPaymentGatewayBankTransfer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentSettingsPaymentGatewayBankTransfer";
import { IShoppingMallPaymentSettingsPaymentGatewayCryptocurrency } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentSettingsPaymentGatewayCryptocurrency";
import { IShoppingMallPaymentSettingsRegionalPricing } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentSettingsRegionalPricing";
import { IShoppingMallPaymentSettingsPaymentRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentSettingsPaymentRateLimit";
export function prepare_random_shopping_mall_payment_settings(
  input?: DeepPartial<IShoppingMallPaymentSettings.ICreate>,
): IShoppingMallPaymentSettings.ICreate {
  return {
    enabledPaymentMethods: ArrayUtil.repeat(
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<4>
      >(),
      () =>
        RandomGenerator.pick([
          "credit_card",
          "digital_wallet",
          "cryptocurrency",
          "bank_transfer",
        ] as const),
    ),
    currencyConfig: {
      baseCurrency: "USD",
      supportedCurrencies: ArrayUtil.repeat(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<10>
        >(),
        () =>
          RandomGenerator.pick([
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
          ] as const),
      ),
      exchangeRateSource: RandomGenerator.pick([
        "fixer.io",
        "exchangerate-api.com",
        "currencyapi.com",
        "internal-rate-db",
      ] as const),
      rateUpdateInterval: RandomGenerator.pick([
        "hourly",
        "daily",
        "weekly",
      ] as const),
      enableDynamicPricing: true,
      currencyDisplayFormat: RandomGenerator.pick([
        "symbol-first",
        "code-first",
        "code-last",
      ] as const),
      minimumExchangeRatePrecision: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<4> & tags.Maximum<8>
      >(),
      fallbackCurrency: "USD",
      autoConvertToCustomerCurrency: true,
      currencyRoundingRule: RandomGenerator.pick([
        "nearest",
        "floor",
        "ceiling",
        "banker",
      ] as const),
    },
    fraudDetection: RandomGenerator.alphaNumeric(32),
    security: RandomGenerator.alphaNumeric(32),
    paymentGatewayConfig: {
      stripe: RandomGenerator.alphaNumeric(32),
      paypal: {
        clientId: RandomGenerator.alphaNumeric(32),
        clientSecret: RandomGenerator.alphaNumeric(64),
        sandboxMode: RandomGenerator.pick([true, false] as const),
        webhookId: typia.random<string & tags.Format<"uuid">>(),
        paymentIntentMode: RandomGenerator.pick([
          "capture",
          "authorize",
        ] as const),
        currency: RandomGenerator.pick(["USD", "EUR", "GBP", "JPY"] as const),
        enableExpressCheckout: RandomGenerator.pick([true, false] as const),
        enableInvoicing: RandomGenerator.pick([true, false] as const),
      },
      square: RandomGenerator.alphaNumeric(32),
      bank_transfer: RandomGenerator.alphaNumeric(32),
      cryptocurrency: {
        accepted_currencies: ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<4>
          >(),
          () =>
            RandomGenerator.pick([
              "BTC",
              "ETH",
              "LTC",
              "USDT",
              "USDC",
              "DOGE",
            ] as const),
        ),
        wallet_address: typia.random<
          string &
            tags.Pattern<"^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39}$|^(0x)[0-9a-fA-F]{40}$|^[L][a-zA-Z0-9]{33}$|^[M][a-zA-Z0-9]{33}$">
        >(),
        conversion_service: RandomGenerator.pick([
          "Coinbase",
          "BitPay",
          "Crypto.com",
          "CoinGate",
          "MoonPay",
        ] as const),
        network: RandomGenerator.pick(["mainnet", "testnet"] as const),
        confirmation_threshold: typia.random<
          number &
            tags.Type<"int32"> &
            tags.Default<3> &
            tags.Minimum<1> &
            tags.Maximum<12>
        >(),
        transaction_fee: RandomGenerator.pick([
          "customer",
          "merchant",
          "shared",
        ] as const),
        reconciliation_delay_minutes: typia.random<
          number &
            tags.Type<"int32"> &
            tags.Default<30> &
            tags.Minimum<5> &
            tags.Maximum<1440>
        >(),
        conversion_rate_refresh_minutes: typia.random<
          number &
            tags.Type<"int32"> &
            tags.Default<10> &
            tags.Minimum<1> &
            tags.Maximum<1440>
        >(),
        input_address_prefix: typia.random<
          string &
            tags.Pattern<"^(BC1|bc1|0x)[a-zA-Z0-9]*$|^[L][a-zA-Z0-9]*$|^[M][a-zA-Z0-9]*$">
        >(),
        private_key_storage_method: RandomGenerator.pick([
          "hot_wallet",
          "cold_storage",
          "hardware_wallet",
          "multi_sign",
        ] as const),
        send_to_address: typia.random<
          string &
            tags.Pattern<"^[0-9]{8,30}$|^(0x)[0-9a-fA-F]{40}$|^[L][a-zA-Z0-9]{33}$|^[M][a-zA-Z0-9]{33}$|^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$">
        >(),
        manage_orders: RandomGenerator.pick([true, false] as const),
        auto_refund_enabled: RandomGenerator.pick([true, false] as const),
      },
    },
    regionalPricing: RandomGenerator.alphaNumeric(32),
    paymentReconciliationSchedule: RandomGenerator.pick([
      "hourly",
      "daily",
      "weekly",
      "monthly",
    ] as const),
    paymentRateLimit: {
      maxTransactionsPerMinute: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
      >(),
      maxTransactionsPerHour: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<10000>
      >(),
      maxFailedTransactionsPerHour: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<5> & tags.Maximum<100>
      >(),
      maxAmountPerTransaction: typia.random<
        number & tags.Minimum<1> & tags.Maximum<100000>
      >(),
      maxAmountPerDay: typia.random<
        number & tags.Minimum<10> & tags.Maximum<500000>
      >(),
      blockDurationMinutes: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<5> & tags.Maximum<1440>
      >(),
      alertThresholdPercentage: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<60> & tags.Maximum<95>
      >(),
      enableIPBasedRateLimiting: RandomGenerator.pick([true, false] as const),
      enableAccountBasedRateLimiting: RandomGenerator.pick([
        true,
        false,
      ] as const),
      enableExponentialBackoff: RandomGenerator.pick([true, false] as const),
      allowPremiumUsersOverride: RandomGenerator.pick([true, false] as const),
    },
    name: RandomGenerator.paragraph({
      sentences: typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
      >(),
      wordMin: 3,
      wordMax: 8,
    }),
    description: RandomGenerator.paragraph({
      sentences: typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
      >(),
      wordMin: 3,
      wordMax: 8,
    }),
  };
}
