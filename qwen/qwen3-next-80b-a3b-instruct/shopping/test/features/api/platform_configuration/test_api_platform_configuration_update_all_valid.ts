import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCatalogConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogConfig";
import type { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";
import type { IShoppingMallConfigurationCacheSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfigurationCacheSettings";
import type { IShoppingMallConfigurationCurrencyConversion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfigurationCurrencyConversion";
import type { IShoppingMallConfigurationEmailTemplateOverrides } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfigurationEmailTemplateOverrides";
import type { IShoppingMallConfigurationExternalIntegrations } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfigurationExternalIntegrations";
import type { IShoppingMallConfigurationFeatureFlags } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfigurationFeatureFlags";
import type { IShoppingMallConfigurationPaymentSurchargeRules } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfigurationPaymentSurchargeRules";
import type { IShoppingMallConfigurationRateLimitPolicies } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfigurationRateLimitPolicies";
import type { IShoppingMallConfigurationSecurityPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfigurationSecurityPolicy";
import type { IShoppingMallConfigurationSystemHealth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfigurationSystemHealth";
import type { IShoppingMallFeatureConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFeatureConfig";
import type { IShoppingMallPaymentConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentConfig";
import type { IShoppingMallSecurityConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSecurityConfig";
import type { IShoppingMallShippingConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingConfig";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_platform_configuration_update_all_valid(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Prepare valid configuration update data
  const configUpdate = {
    enablePaymentProcessing: true,
    paymentTimeoutSeconds: 60,
    defaultShippingMethod: "standard",
    maxProductImagesPerProduct: 5,
    reviewModerationEnabled: true,
    autoRefundEnabled: true,
  } satisfies IShoppingMallConfiguration.IUpdate;
  // Step 3: Update platform configuration
  const updatedConfig =
    await api.functional.shoppingMall.admin.platform.configurations.update(
      adminConnection,
      {
        body: configUpdate,
      },
    );
  typia.assert(updatedConfig);
}
