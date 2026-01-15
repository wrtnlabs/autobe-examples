import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { prepare_random_shopping_mall_payment_settings } from "../prepare/prepare_random_shopping_mall_payment_settings";
export async function generate_random_shopping_mall_admin_payment_settings_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallPaymentSettings.ICreate> | undefined;
  },
): Promise<IShoppingMallPaymentSettings> {
  const prepared: IShoppingMallPaymentSettings.ICreate =
    prepare_random_shopping_mall_payment_settings(props.body);
  return await api.functional.shoppingMall.admin.payment_settings.create(
    connection,
    {
      body: prepared,
    },
  );
}
