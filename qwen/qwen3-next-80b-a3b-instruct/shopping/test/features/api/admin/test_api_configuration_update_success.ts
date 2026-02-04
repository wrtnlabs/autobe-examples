import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";
import { prepare_random_shopping_mall_configuration } from "../../../prepare/prepare_random_shopping_mall_configuration";
import { generate_random_shopping_mall_admin_configurations_create } from "../../../generate/generate_random_shopping_mall_admin_configurations_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_configuration_update_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@example.com",
      password: "SecurePass123!",
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: "192.168.1.1",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Step 2: Create update payload with complete configuration values
  // Flatten feature_toggles properties to top level as required by IShoppingMallConfiguration.ICreate
  const updatePayload = {
    currency: "USD",
    timezone: "America/New_York",
    locale: "en-US",
    payment_gateway: "stripe",
    tax_calculation: "standard",
    shipping_rate_strategy: "flat",
    // Extract feature_toggles properties to top level
    allow_seller_registration: true,
    require_email_verification: true,
    enable_product_reviews: true,
    auto_approve_sellers: false,
    allow_guest_checkout: true,
    use_dynamic_pricing: false,
    enable_live_chat: true,
    allow_bulk_product_import: false,
  } satisfies IShoppingMallConfiguration.ICreate;
  // Step 3: Perform configuration update
  const updatedConfig: IShoppingMallConfiguration =
    await api.functional.shoppingMall.admin.configurations.create(
      adminConnection,
      { body: updatePayload },
    );
  // Step 4: Validate response structure and updated values
  typia.assert(updatedConfig);
  // Validate specific updated properties
  TestValidator.equals("currency updated", updatedConfig.currency, "USD");
  TestValidator.equals(
    "timezone updated",
    updatedConfig.timezone,
    "America/New_York",
  );
  TestValidator.equals("locale updated", updatedConfig.locale, "en-US");
  TestValidator.equals(
    "payment gateway updated",
    updatedConfig.payment_gateway,
    "stripe",
  );
  TestValidator.equals(
    "tax calculation updated",
    updatedConfig.tax_calculation,
    "standard",
  );
  TestValidator.equals(
    "shipping strategy updated",
    updatedConfig.shipping_rate_strategy,
    "flat",
  );
  // Validate feature toggles (now accessible as top-level properties on updatedConfig)
  TestValidator.equals(
    "seller registration allowed",
    updatedConfig.feature_toggles.allow_seller_registration,
    true,
  );
  TestValidator.equals(
    "email verification required",
    updatedConfig.feature_toggles.require_email_verification,
    true,
  );
  TestValidator.equals(
    "product reviews enabled",
    updatedConfig.feature_toggles.enable_product_reviews,
    true,
  );
  TestValidator.equals(
    "auto-approve sellers disabled",
    updatedConfig.feature_toggles.auto_approve_sellers,
    false,
  );
  TestValidator.equals(
    "guest checkout enabled",
    updatedConfig.feature_toggles.allow_guest_checkout,
    true,
  );
  TestValidator.equals(
    "dynamic pricing disabled",
    updatedConfig.feature_toggles.use_dynamic_pricing,
    false,
  );
  TestValidator.equals(
    "live chat enabled",
    updatedConfig.feature_toggles.enable_live_chat,
    true,
  );
  TestValidator.equals(
    "bulk import disabled",
    updatedConfig.feature_toggles.allow_bulk_product_import,
    false,
  );
  // Validate system-managed properties
  // No additional validation needed as typia.assert() already validates
  // created_at and updated_at are in ISO date-time format
  // The snapshot system creates a new version, but we cannot access
  // historical snapshots from this endpoint
}
