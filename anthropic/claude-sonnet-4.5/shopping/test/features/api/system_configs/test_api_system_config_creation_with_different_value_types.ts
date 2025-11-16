import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfig";

/**
 * Test the creation of system configurations with various value_type
 * specifications to ensure proper data type handling.
 *
 * An administrator creates multiple configurations representing different data
 * types: 'string' for text values (e.g., platform_name), 'integer' for whole
 * numbers (e.g., max_product_images), 'decimal' for floating-point numbers
 * (e.g., default_commission_rate as '15.5'), 'boolean' for true/false flags
 * (e.g., 'true' or 'false' strings for feature toggles), 'json' for complex
 * objects or arrays, and 'url' for web addresses (e.g.,
 * payment_gateway_endpoint). The test validates that all value_type options are
 * supported and that config_value strings are stored correctly regardless of
 * the underlying data type. This scenario ensures the flexible string-based
 * storage system works correctly for all supported data types.
 *
 * Steps:
 *
 * 1. Create an admin account and authenticate
 * 2. Create system configuration with 'string' value_type
 * 3. Create system configuration with 'integer' value_type
 * 4. Create system configuration with 'decimal' value_type
 * 5. Create system configuration with 'boolean' value_type
 * 6. Create system configuration with 'json' value_type
 * 7. Create system configuration with 'url' value_type
 * 8. Validate all configurations are created correctly with proper value_type
 *    metadata
 */
export async function test_api_system_config_creation_with_different_value_types(
  connection: api.IConnection,
) {
  // Step 1: Create an admin account and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "Admin@123456",
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin",
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create system configuration with 'string' value_type
  const stringConfig =
    await api.functional.shoppingMall.admin.systemConfigs.create(connection, {
      body: {
        config_key: "platform_name",
        config_value: "My Shopping Mall",
        value_type: "string",
        description: "The name of the e-commerce platform displayed to users",
        category: "platform",
        status: "active",
        is_sensitive: false,
      } satisfies IShoppingMallSystemConfig.ICreate,
    });
  typia.assert(stringConfig);
  TestValidator.equals(
    "string config key matches",
    stringConfig.config_key,
    "platform_name",
  );
  TestValidator.equals(
    "string config value matches",
    stringConfig.config_value,
    "My Shopping Mall",
  );
  TestValidator.equals(
    "string value_type matches",
    stringConfig.value_type,
    "string",
  );

  // Step 3: Create system configuration with 'integer' value_type
  const integerConfig =
    await api.functional.shoppingMall.admin.systemConfigs.create(connection, {
      body: {
        config_key: "max_product_images",
        config_value: "10",
        value_type: "integer",
        description: "Maximum number of images allowed per product listing",
        category: "platform",
        status: "active",
        is_sensitive: false,
      } satisfies IShoppingMallSystemConfig.ICreate,
    });
  typia.assert(integerConfig);
  TestValidator.equals(
    "integer config key matches",
    integerConfig.config_key,
    "max_product_images",
  );
  TestValidator.equals(
    "integer config value matches",
    integerConfig.config_value,
    "10",
  );
  TestValidator.equals(
    "integer value_type matches",
    integerConfig.value_type,
    "integer",
  );

  // Step 4: Create system configuration with 'decimal' value_type
  const decimalConfig =
    await api.functional.shoppingMall.admin.systemConfigs.create(connection, {
      body: {
        config_key: "default_commission_rate",
        config_value: "15.5",
        value_type: "decimal",
        description:
          "Default commission rate percentage applied to seller transactions",
        category: "commission",
        status: "active",
        is_sensitive: false,
      } satisfies IShoppingMallSystemConfig.ICreate,
    });
  typia.assert(decimalConfig);
  TestValidator.equals(
    "decimal config key matches",
    decimalConfig.config_key,
    "default_commission_rate",
  );
  TestValidator.equals(
    "decimal config value matches",
    decimalConfig.config_value,
    "15.5",
  );
  TestValidator.equals(
    "decimal value_type matches",
    decimalConfig.value_type,
    "decimal",
  );

  // Step 5: Create system configuration with 'boolean' value_type
  const booleanConfig =
    await api.functional.shoppingMall.admin.systemConfigs.create(connection, {
      body: {
        config_key: "enable_guest_checkout",
        config_value: "true",
        value_type: "boolean",
        description:
          "Feature flag to enable or disable guest checkout without registration",
        category: "features",
        status: "active",
        is_sensitive: false,
      } satisfies IShoppingMallSystemConfig.ICreate,
    });
  typia.assert(booleanConfig);
  TestValidator.equals(
    "boolean config key matches",
    booleanConfig.config_key,
    "enable_guest_checkout",
  );
  TestValidator.equals(
    "boolean config value matches",
    booleanConfig.config_value,
    "true",
  );
  TestValidator.equals(
    "boolean value_type matches",
    booleanConfig.value_type,
    "boolean",
  );

  // Step 6: Create system configuration with 'json' value_type
  const jsonConfig =
    await api.functional.shoppingMall.admin.systemConfigs.create(connection, {
      body: {
        config_key: "shipping_zones",
        config_value: JSON.stringify({
          domestic: ["Seoul", "Busan"],
          international: ["US", "JP"],
        }),
        value_type: "json",
        description:
          "Shipping zone configuration with domestic and international regions",
        category: "shipping",
        status: "active",
        is_sensitive: false,
      } satisfies IShoppingMallSystemConfig.ICreate,
    });
  typia.assert(jsonConfig);
  TestValidator.equals(
    "json config key matches",
    jsonConfig.config_key,
    "shipping_zones",
  );
  TestValidator.predicate(
    "json config value is valid JSON",
    JSON.parse(jsonConfig.config_value) !== null,
  );
  TestValidator.equals(
    "json value_type matches",
    jsonConfig.value_type,
    "json",
  );

  // Step 7: Create system configuration with 'url' value_type
  const urlConfig =
    await api.functional.shoppingMall.admin.systemConfigs.create(connection, {
      body: {
        config_key: "payment_gateway_endpoint",
        config_value: "https://api.payment-gateway.com/v1/process",
        value_type: "url",
        description: "API endpoint URL for payment gateway integration",
        category: "payment",
        status: "active",
        is_sensitive: true,
      } satisfies IShoppingMallSystemConfig.ICreate,
    });
  typia.assert(urlConfig);
  TestValidator.equals(
    "url config key matches",
    urlConfig.config_key,
    "payment_gateway_endpoint",
  );
  TestValidator.equals(
    "url config value matches",
    urlConfig.config_value,
    "https://api.payment-gateway.com/v1/process",
  );
  TestValidator.equals("url value_type matches", urlConfig.value_type, "url");
  TestValidator.equals(
    "url is_sensitive flag matches",
    urlConfig.is_sensitive,
    true,
  );
}
