import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfig";

/**
 * Test administrator's ability to retrieve detailed system configuration by ID.
 *
 * This test validates the complete workflow of system configuration retrieval:
 *
 * 1. Admin authentication to obtain access credentials
 * 2. System configuration creation with test data
 * 3. Configuration retrieval by unique identifier
 * 4. Validation of all configuration metadata fields
 *
 * The test ensures administrators can view complete configuration details
 * including config key, current value, description, and system identifiers for
 * proper platform parameter management and administrative decision-making.
 */
export async function test_api_system_config_retrieval_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin user
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    role_level: "super_admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminData });
  typia.assert(admin);

  // Step 2: Create a system configuration entry
  const configData = {
    config_key: `platform.test.${RandomGenerator.alphaNumeric(8)}`,
    config_value: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallSystemConfig.ICreate;

  const createdConfig: IShoppingMallSystemConfig =
    await api.functional.shoppingMall.admin.systemConfigs.create(connection, {
      body: configData,
    });
  typia.assert(createdConfig);

  // Step 3: Retrieve the configuration by ID
  const retrievedConfig: IShoppingMallSystemConfig =
    await api.functional.shoppingMall.admin.systemConfigs.at(connection, {
      configId: createdConfig.id,
    });
  typia.assert(retrievedConfig);

  // Step 4: Validate retrieved configuration matches created configuration
  TestValidator.equals(
    "retrieved config ID matches created config",
    retrievedConfig.id,
    createdConfig.id,
  );

  TestValidator.equals(
    "retrieved config key matches created config",
    retrievedConfig.config_key,
    createdConfig.config_key,
  );

  TestValidator.equals(
    "retrieved config value matches created config",
    retrievedConfig.config_value,
    createdConfig.config_value,
  );

  TestValidator.equals(
    "retrieved config description matches created config",
    retrievedConfig.description,
    createdConfig.description,
  );
}
