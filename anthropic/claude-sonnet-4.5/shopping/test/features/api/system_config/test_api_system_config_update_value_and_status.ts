import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfig";

/**
 * Test complete system configuration update workflow where an administrator
 * modifies an existing configuration setting.
 *
 * This test validates the core configuration management capability by:
 *
 * 1. Creating and authenticating an administrator account with system
 *    configuration management permissions
 * 2. Creating an initial system configuration with specific values
 * 3. Updating multiple aspects of the configuration including config_value,
 *    status, description, and category
 * 4. Validating that all updated fields are properly reflected in the response
 * 5. Verifying that the updated_at timestamp is modified while config_key remains
 *    unchanged
 *
 * The test ensures platform administrators can modify platform-wide settings
 * dynamically, which is essential for runtime configuration management without
 * requiring application restarts.
 */
export async function test_api_system_config_update_value_and_status(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Admin@12345";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin",
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create initial system configuration
  const configKey = `test_config_${RandomGenerator.alphaNumeric(8)}`;
  const initialValue = "initial_value";
  const initialDescription = "Initial configuration description";

  const createdConfig =
    await api.functional.shoppingMall.admin.systemConfigs.create(connection, {
      body: {
        config_key: configKey,
        config_value: initialValue,
        value_type: "string",
        description: initialDescription,
        category: "platform",
        status: "active",
        is_sensitive: false,
      } satisfies IShoppingMallSystemConfig.ICreate,
    });
  typia.assert(createdConfig);

  // Validate initial configuration
  TestValidator.equals(
    "initial config key matches",
    createdConfig.config_key,
    configKey,
  );
  TestValidator.equals(
    "initial config value matches",
    createdConfig.config_value,
    initialValue,
  );
  TestValidator.equals(
    "initial status is active",
    createdConfig.status,
    "active",
  );
  TestValidator.equals(
    "initial category is platform",
    createdConfig.category,
    "platform",
  );

  // Step 3: Update the configuration with modified values
  const updatedValue = "updated_value";
  const updatedDescription =
    "Updated configuration description with new details";
  const updatedCategory = "features";
  const updatedStatus = "inactive";

  const updatedConfig =
    await api.functional.shoppingMall.admin.systemConfigs.update(connection, {
      configKey: configKey,
      body: {
        config_value: updatedValue,
        description: updatedDescription,
        category: updatedCategory,
        status: updatedStatus,
      } satisfies IShoppingMallSystemConfig.IUpdate,
    });
  typia.assert(updatedConfig);

  // Step 4: Validate all updated fields
  TestValidator.equals(
    "config key remains unchanged",
    updatedConfig.config_key,
    configKey,
  );
  TestValidator.equals(
    "config value updated successfully",
    updatedConfig.config_value,
    updatedValue,
  );
  TestValidator.equals(
    "description updated successfully",
    updatedConfig.description,
    updatedDescription,
  );
  TestValidator.equals(
    "category updated successfully",
    updatedConfig.category,
    updatedCategory,
  );
  TestValidator.equals(
    "status updated successfully",
    updatedConfig.status,
    updatedStatus,
  );

  // Step 5: Validate metadata fields
  TestValidator.equals(
    "config ID remains unchanged",
    updatedConfig.id,
    createdConfig.id,
  );
  TestValidator.notEquals(
    "updated_at timestamp has changed",
    updatedConfig.updated_at,
    createdConfig.updated_at,
  );
  TestValidator.equals(
    "created_at timestamp remains unchanged",
    updatedConfig.created_at,
    createdConfig.created_at,
  );

  // Step 6: Verify immutable fields remain unchanged
  TestValidator.equals(
    "value_type remains unchanged",
    updatedConfig.value_type,
    createdConfig.value_type,
  );
  TestValidator.equals(
    "is_sensitive flag remains unchanged",
    updatedConfig.is_sensitive,
    createdConfig.is_sensitive,
  );
}
