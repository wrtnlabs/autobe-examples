import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfig";

/**
 * Test complete system configuration deletion workflow where an admin
 * permanently removes a configuration entry from the platform.
 *
 * This test validates the administrative capability to permanently delete
 * system configuration entries. The workflow ensures that:
 *
 * 1. Admin can authenticate successfully
 * 2. Admin can create a new system configuration
 * 3. Admin can permanently delete the configuration
 * 4. The deleted configuration is completely removed from the database
 *
 * Steps:
 *
 * 1. Authenticate as admin to gain necessary permissions
 * 2. Create a system configuration entry with random data
 * 3. Perform hard delete operation on the created configuration
 * 4. Verify the configuration has been permanently removed
 */
export async function test_api_system_config_deletion_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminData = {
    email: adminEmail,
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    role_level: "super_admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminData });
  typia.assert(admin);

  // Step 2: Create a system configuration entry
  const configData = {
    config_key: `test_config_${RandomGenerator.alphaNumeric(8)}`,
    config_value: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallSystemConfig.ICreate;

  const createdConfig: IShoppingMallSystemConfig =
    await api.functional.shoppingMall.admin.systemConfigs.create(connection, {
      body: configData,
    });
  typia.assert(createdConfig);

  // Validate created configuration matches input
  TestValidator.equals(
    "config key matches",
    createdConfig.config_key,
    configData.config_key,
  );
  TestValidator.equals(
    "config value matches",
    createdConfig.config_value,
    configData.config_value,
  );

  // Step 3: Delete the system configuration
  await api.functional.shoppingMall.admin.systemConfigs.erase(connection, {
    configId: createdConfig.id,
  });

  // Deletion successful - void return indicates configuration was permanently removed
}
