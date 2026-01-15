import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPaymentSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentSettings";
import type { IShoppingMallPaymentSettingsCurrencyConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentSettingsCurrencyConfig";
import type { IShoppingMallPaymentSettingsFraudDetection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentSettingsFraudDetection";
import type { IShoppingMallPaymentSettingsPaymentGatewayBankTransfer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentSettingsPaymentGatewayBankTransfer";
import type { IShoppingMallPaymentSettingsPaymentGatewayConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentSettingsPaymentGatewayConfig";
import type { IShoppingMallPaymentSettingsPaymentGatewayCryptocurrency } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentSettingsPaymentGatewayCryptocurrency";
import type { IShoppingMallPaymentSettingsPaymentGatewayPayPal } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentSettingsPaymentGatewayPayPal";
import type { IShoppingMallPaymentSettingsPaymentGatewaySquare } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentSettingsPaymentGatewaySquare";
import type { IShoppingMallPaymentSettingsPaymentGatewayStripe } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentSettingsPaymentGatewayStripe";
import type { IShoppingMallPaymentSettingsPaymentRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentSettingsPaymentRateLimit";
import type { IShoppingMallPaymentSettingsRegionalPricing } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentSettingsRegionalPricing";
import type { IShoppingMallPaymentSettingsSecurity } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentSettingsSecurity";
import { prepare_random_shopping_mall_payment_settings } from "../../../prepare/prepare_random_shopping_mall_payment_settings";
import { generate_random_shopping_mall_admin_payment_settings_create } from "../../../generate/generate_random_shopping_mall_admin_payment_settings_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_payment_settings_creation_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin/signup",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Create comprehensive payment settings configuration
  const paymentConfigResponse =
    await generate_random_shopping_mall_admin_payment_settings_create(
      adminConnection,
      {
        body: {
          enabledPaymentMethods: [
            "credit_card",
            "digital_wallet",
            "cryptocurrency",
            "bank_transfer",
          ],
          currencyConfig: {
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
          } satisfies IShoppingMallPaymentSettingsCurrencyConfig,
          fraudDetection: JSON.stringify({
            enabled: true,
            maxAmountPerTransaction: 5000,
            maxFailedTransactionsPerHour: 10,
            minOrderValue: 100,
            maxTransactionsPerMinute: 100,
            maxTransactionsPerDay: 1000,
          }),
          security: JSON.stringify({
            enableSSL: true,
            enable2FA: true,
            enableIPWhitelist: true,
            enableAuditLog: true,
            maxFailedLoginAttempts: 5,
            sessionTimeoutMinutes: 30,
          }),
          paymentGatewayConfig: {
            stripe:
              "pk_live_" +
              RandomGenerator.alphaNumeric(24) +
              ",sk_live_" +
              RandomGenerator.alphaNumeric(40) +
              ",false,wh_" +
              RandomGenerator.alphaNumeric(24) +
              ",capture,USD",
            paypal: {
              clientId: "AQ..." + RandomGenerator.alphaNumeric(64),
              clientSecret: "E..." + RandomGenerator.alphaNumeric(64),
              sandboxMode: false,
              webhookId: "W..." + RandomGenerator.alphaNumeric(32),
              paymentIntentMode: "capture",
              currency: "USD",
              enableExpressCheckout: true,
              enableInvoicing: true,
            } satisfies IShoppingMallPaymentSettingsPaymentGatewayPayPal,
            square: "sq0idp-" + RandomGenerator.alphaNumeric(40),
            bank_transfer:
              "Wells Fargo;Company Payments Account;121000248;123456789;WFBIUS6S;USD;Please reference order ID in payment description",
            cryptocurrency: {
              accepted_currencies: ["BTC", "ETH", "USDT"],
              wallet_address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
              conversion_service: "Coinbase",
              network: "mainnet",
              confirmation_threshold: 3,
              transaction_fee: "customer",
              reconciliation_delay_minutes: 30,
              conversion_rate_refresh_minutes: 10,
              input_address_prefix: "bc1",
              private_key_storage_method: "hardware_wallet",
              send_to_address: "0x80d9f31506c4689513888e36e8f987d17886e576",
              manage_orders: true,
              auto_refund_enabled: true,
            } satisfies IShoppingMallPaymentSettingsPaymentGatewayCryptocurrency,
          } satisfies IShoppingMallPaymentSettingsPaymentGatewayConfig,
          regionalPricing: JSON.stringify({
            US: {},
            CA: {},
            GB: {},
            JP: {},
          }),
          paymentReconciliationSchedule: "daily",
          paymentRateLimit: {
            maxTransactionsPerMinute: 200,
            maxTransactionsPerHour: 1000,
            maxFailedTransactionsPerHour: 20,
            maxAmountPerTransaction: 10000,
            maxAmountPerDay: 25000,
            blockDurationMinutes: 60,
            alertThresholdPercentage: 80,
            enableIPBasedRateLimiting: true,
            enableAccountBasedRateLimiting: true,
            enableExponentialBackoff: true,
            allowPremiumUsersOverride: false,
          } satisfies IShoppingMallPaymentSettingsPaymentRateLimit,
          name: "Primary Payment Configuration",
          description:
            "Comprehensive payment settings for global e-commerce operations",
        } satisfies IShoppingMallPaymentSettings.ICreate,
      },
    );
  // Type assertion to expose the properties on the response
  const paymentConfig = typia.assert<IShoppingMallPaymentSettings.ICreate>(paymentConfigResponse);
  typia.assert(paymentConfig);
  // Step 3: Validate the created payment configuration
  TestValidator.equals(
    "payment config name",
    paymentConfig.name,
    "Primary Payment Configuration",
  );
  TestValidator.equals(
    "payment config description",
    paymentConfig.description,
    "Comprehensive payment settings for global e-commerce operations",
  );
  TestValidator.predicate(
    "payment methods are enabled",
    paymentConfig.enabledPaymentMethods.length > 0,
  );
  TestValidator.predicate(
    "currency config is valid",
    paymentConfig.currencyConfig.baseCurrency === "USD",
  );
}