import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfig";

/**
 * Test configuration data type flexibility by updating both config_value and
 * value_type together to change the type representation of a setting.
 *
 * This scenario validates the system's ability to handle configuration type
 * evolution where the nature of a setting changes over time.
 *
 * The test workflow proceeds as follows:
 *
 * 1. Create and authenticate an admin account to gain system configuration
 *    management permissions
 * 2. Create an initial system configuration with a boolean value_type (e.g.,
 *    value_type: 'boolean', config_value: 'true')
 * 3. Update the same configuration to a numeric type (e.g., value_type: 'decimal',
 *    config_value: '15.5')
 * 4. Validate that both config_value and value_type fields are updated correctly
 *    and maintain consistency between the type metadata and the actual value
 *    representation
 */
export async function test_api_system_config_update_value_type_change(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "SecureAdminPass123!",
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        admin_level: "super_admin",
        email_verified: true,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create initial configuration with boolean type
  const configKey = `test_config_${RandomGenerator.alphaNumeric(8)}`;
  const initialConfig: IShoppingMallSystemConfig =
    await api.functional.shoppingMall.admin.systemConfigs.create(connection, {
      body: {
        config_key: configKey,
        config_value: "true",
        value_type: "boolean",
        description: "Test configuration for value type change validation",
        category: "features",
        status: "active",
        is_sensitive: false,
      } satisfies IShoppingMallSystemConfig.ICreate,
    });
  typia.assert(initialConfig);

  // Validate initial configuration
  TestValidator.equals(
    "initial config key matches",
    initialConfig.config_key,
    configKey,
  );
  TestValidator.equals(
    "initial config value is boolean string",
    initialConfig.config_value,
    "true",
  );
  TestValidator.equals(
    "initial value type is boolean",
    initialConfig.value_type,
    "boolean",
  );

  // Step 3: Update configuration to decimal numeric type
  const updatedConfig: IShoppingMallSystemConfig =
    await api.functional.shoppingMall.admin.systemConfigs.update(connection, {
      configKey: configKey,
      body: {
        config_value: "15.5",
        value_type: "decimal",
      } satisfies IShoppingMallSystemConfig.IUpdate,
    });
  typia.assert(updatedConfig);

  // Step 4: Validate that both fields updated correctly
  TestValidator.equals(
    "updated config key remains same",
    updatedConfig.config_key,
    configKey,
  );
  TestValidator.equals(
    "updated config value is decimal string",
    updatedConfig.config_value,
    "15.5",
  );
  TestValidator.equals(
    "updated value type is decimal",
    updatedConfig.value_type,
    "decimal",
  );

  // Validate consistency between value_type and config_value representation
  TestValidator.predicate(
    "config value represents a valid decimal number",
    !isNaN(parseFloat(updatedConfig.config_value)) &&
      updatedConfig.config_value.includes("."),
  );

  // Verify other fields remain unchanged
  TestValidator.equals(
    "description unchanged",
    updatedConfig.description,
    initialConfig.description,
  );
  TestValidator.equals(
    "category unchanged",
    updatedConfig.category,
    initialConfig.category,
  );
  TestValidator.equals(
    "status unchanged",
    updatedConfig.status,
    initialConfig.status,
  );
  TestValidator.equals(
    "sensitivity flag unchanged",
    updatedConfig.is_sensitive,
    initialConfig.is_sensitive,
  );
}
