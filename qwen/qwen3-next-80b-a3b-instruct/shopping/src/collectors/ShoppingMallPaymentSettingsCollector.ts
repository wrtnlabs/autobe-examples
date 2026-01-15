import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

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

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallPaymentSettingsCollector {
  export async function collect(props: {
    body: IShoppingMallPaymentSettings.ICreate;
  }) {
    return {
      id: v4(),
      payment_timeout_seconds: 300,
      max_retry_attempts: 3,
      sla_threshold_minutes: 60,
      disable_card_payments: false,
      disable_wallet_payments: false,
      disable_crypto_payments: false,
      enable_surcharge: false,
      enable_rate_limiting: true,
      enable_webhooks: true,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    } satisfies Prisma.shopping_mall_payment_settingsCreateInput;
  }
}
