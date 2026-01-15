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
import type { IShoppingMallPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformConfiguration";
import type { IShoppingMallSecurityConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSecurityConfig";
import type { IShoppingMallShippingConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingConfig";
import { prepare_random_shopping_mall_platform_configuration } from "../../../prepare/prepare_random_shopping_mall_platform_configuration";
import { generate_random_shopping_mall_admin_platform_configurations_create } from "../../../generate/generate_random_shopping_mall_admin_platform_configurations_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_platform_configuration_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authorize admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/admin/join",
        referrer: "https://example.com/admin/signup",
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Create platform configuration for enablePaymentProcessing
  const enablePaymentProcessingKey = "enablePaymentProcessing";
  const enablePaymentProcessingConfig: IShoppingMallPlatformConfiguration =
    await generate_random_shopping_mall_admin_platform_configurations_create(
      adminConnection,
      {
        body: {
          name: enablePaymentProcessingKey,
          value: "true", // Stringified boolean
          description: "Enable payment processing system",
        } satisfies IShoppingMallPlatformConfiguration.ICreate,
      },
    );
  typia.assert(enablePaymentProcessingConfig);
  // Step 3: Create platform configuration for maxProductImagesPerProduct
  const maxImagesKey = "maxProductImagesPerProduct";
  const maxImagesConfig: IShoppingMallPlatformConfiguration =
    await generate_random_shopping_mall_admin_platform_configurations_create(
      adminConnection,
      {
        body: {
          name: maxImagesKey,
          value: "8", // Stringified number -> 8
          description: "Maximum product images per product",
        } satisfies IShoppingMallPlatformConfiguration.ICreate,
      },
    );
  typia.assert(maxImagesConfig);
  // Step 4: Update enablePaymentProcessing to false using the update endpoint
  // The IShoppingMallConfiguration.IUpdate object is used with the configCode
  const updateBody: IShoppingMallConfiguration.IUpdate = {
    enablePaymentProcessing: false,
  } satisfies IShoppingMallConfiguration.IUpdate;
  const updatedConfig: IShoppingMallConfiguration =
    await api.functional.shoppingMall.admin.configurations.update(
      adminConnection,
      {
        configCode: enablePaymentProcessingKey,
        body: updateBody,
      },
    );
  typia.assert(updatedConfig);
  // Step 5: Validate the update was successful
  // Parse the features JSON string to access the feature flags
  const features: {
    [key: string]: any;
  } = JSON.parse(updatedConfig.features);
  // Validate enablePaymentProcessing was updated
  TestValidator.equals(
    "enablePaymentProcessing updated to false",
    features.enablePaymentProcessing,
    false,
  );
  // Validate maxProductImagesPerProduct has the expected value (8)
  TestValidator.equals(
    "maxProductImagesPerProduct value unchanged",
    features.maxProductImagesPerProduct,
    8,
  );
}
