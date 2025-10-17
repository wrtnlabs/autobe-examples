import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfig";

/**
 * Test complete system configuration update workflow where an admin modifies
 * platform-wide settings.
 *
 * This test validates the core administrative capability to adjust business
 * rules and operational parameters through configuration management. The test
 * follows this workflow:
 *
 * 1. Admin authenticates by joining/registering to gain necessary permissions
 * 2. Admin creates a new system configuration entry with initial values
 * 3. Admin updates the configuration entry with new values
 * 4. Verify that configuration changes are properly persisted and values match
 *    expectations
 *
 * This ensures that admins can successfully create and modify system-wide
 * settings that control platform behavior, business rules, and operational
 * parameters.
 */
export async function test_api_system_config_update_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Admin authentication - join/register as admin
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    role_level: "super_admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 2: Create a new system configuration entry
  const initialConfigValue = RandomGenerator.alphaNumeric(10);
  const configKey = `test.config.${RandomGenerator.alphaNumeric(8)}`;

  const createConfigData = {
    config_key: configKey,
    config_value: initialConfigValue,
  } satisfies IShoppingMallSystemConfig.ICreate;

  const createdConfig: IShoppingMallSystemConfig =
    await api.functional.shoppingMall.admin.systemConfigs.create(connection, {
      body: createConfigData,
    });
  typia.assert(createdConfig);

  // Validate created configuration
  TestValidator.equals(
    "config key matches",
    createdConfig.config_key,
    configKey,
  );
  TestValidator.equals(
    "initial config value matches",
    createdConfig.config_value,
    initialConfigValue,
  );

  // Step 3: Update the system configuration entry
  const updatedConfigValue = RandomGenerator.alphaNumeric(12);

  const updateConfigData = {
    config_value: updatedConfigValue,
  } satisfies IShoppingMallSystemConfig.IUpdate;

  const updatedConfig: IShoppingMallSystemConfig =
    await api.functional.shoppingMall.admin.systemConfigs.update(connection, {
      configId: createdConfig.id,
      body: updateConfigData,
    });
  typia.assert(updatedConfig);

  // Step 4: Validate the updated configuration
  TestValidator.equals(
    "config ID unchanged",
    updatedConfig.id,
    createdConfig.id,
  );
  TestValidator.equals(
    "config key unchanged",
    updatedConfig.config_key,
    configKey,
  );
  TestValidator.equals(
    "config value updated",
    updatedConfig.config_value,
    updatedConfigValue,
  );
  TestValidator.notEquals(
    "config value changed from initial",
    updatedConfig.config_value,
    initialConfigValue,
  );
}
