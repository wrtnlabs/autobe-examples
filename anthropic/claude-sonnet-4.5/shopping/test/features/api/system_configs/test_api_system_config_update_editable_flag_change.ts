import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfig";

/**
 * Test admin's ability to update system configuration values.
 *
 * This test validates that administrators can successfully modify system
 * configuration values after creation. It ensures the update operation persists
 * changes correctly while maintaining other configuration properties.
 *
 * Test workflow:
 *
 * 1. Admin authenticates to obtain authorization token
 * 2. Admin creates a new system configuration with initial value
 * 3. Admin updates the configuration with a new value
 * 4. Validate the configuration value was updated successfully
 * 5. Verify other properties (id, config_key, description) remain unchanged
 */
export async function test_api_system_config_update_editable_flag_change(
  connection: api.IConnection,
) {
  // 1. Admin authenticates
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: RandomGenerator.name(),
      role_level: "super_admin",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Create initial system configuration
  const initialConfigValue = RandomGenerator.alphaNumeric(16);
  const configKey = `test.config.${RandomGenerator.alphaNumeric(8)}`;

  const createdConfig =
    await api.functional.shoppingMall.admin.systemConfigs.create(connection, {
      body: {
        config_key: configKey,
        config_value: initialConfigValue,
      } satisfies IShoppingMallSystemConfig.ICreate,
    });
  typia.assert(createdConfig);

  // 3. Update the configuration value
  const updatedConfigValue = RandomGenerator.alphaNumeric(16);

  const updatedConfig =
    await api.functional.shoppingMall.admin.systemConfigs.update(connection, {
      configId: createdConfig.id,
      body: {
        config_value: updatedConfigValue,
      } satisfies IShoppingMallSystemConfig.IUpdate,
    });
  typia.assert(updatedConfig);

  // 4. Validate the configuration value was updated
  TestValidator.equals(
    "config value should be updated",
    updatedConfig.config_value,
    updatedConfigValue,
  );

  // 5. Verify other properties remain unchanged
  TestValidator.equals(
    "config ID should remain the same",
    updatedConfig.id,
    createdConfig.id,
  );

  TestValidator.equals(
    "config key should remain unchanged",
    updatedConfig.config_key,
    createdConfig.config_key,
  );

  TestValidator.equals(
    "config description should remain unchanged",
    updatedConfig.description,
    createdConfig.description,
  );
}
