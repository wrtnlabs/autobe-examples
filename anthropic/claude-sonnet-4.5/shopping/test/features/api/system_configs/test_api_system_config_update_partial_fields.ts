import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfig";

/**
 * Test partial update capability for system configuration.
 *
 * This test validates that the system configuration update endpoint correctly
 * handles partial updates where only specific fields are modified while other
 * fields remain unchanged. It creates a complete configuration, performs a
 * partial update on selected fields, and verifies that updated fields reflect
 * new values while unchanged fields retain their original values.
 *
 * Test workflow:
 *
 * 1. Create and authenticate an admin account
 * 2. Create a complete system configuration with all fields populated
 * 3. Perform a partial update modifying only description and status fields
 * 4. Validate that updated fields have new values and unchanged fields retain
 *    original values
 * 5. Verify that updated_at timestamp is modified while created_at remains
 *    unchanged
 */
export async function test_api_system_config_update_partial_fields(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "SecurePassword123!",
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        admin_level: "super_admin",
        email_verified: true,
        href: "https://admin.example.com/register" satisfies string &
          tags.Format<"uri">,
        referrer: "https://admin.example.com/login" satisfies string &
          tags.Format<"uri">,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a complete system configuration with all fields populated
  const originalConfigKey = `test_config_${RandomGenerator.alphaNumeric(8)}`;
  const originalConfigValue = "original_value_12345";
  const originalValueType = "string";
  const originalDescription =
    "This is the original description for the test configuration";
  const originalCategory = "platform" as const;
  const originalStatus = "active" as const;
  const originalIsSensitive = false;

  const createdConfig: IShoppingMallSystemConfig =
    await api.functional.shoppingMall.admin.systemConfigs.create(connection, {
      body: {
        config_key: originalConfigKey,
        config_value: originalConfigValue,
        value_type: originalValueType,
        description: originalDescription,
        category: originalCategory,
        status: originalStatus,
        is_sensitive: originalIsSensitive,
      } satisfies IShoppingMallSystemConfig.ICreate,
    });
  typia.assert(createdConfig);

  // Validate created configuration
  TestValidator.equals(
    "created config_key matches",
    createdConfig.config_key,
    originalConfigKey,
  );
  TestValidator.equals(
    "created config_value matches",
    createdConfig.config_value,
    originalConfigValue,
  );
  TestValidator.equals(
    "created value_type matches",
    createdConfig.value_type,
    originalValueType,
  );
  TestValidator.equals(
    "created description matches",
    createdConfig.description,
    originalDescription,
  );
  TestValidator.equals(
    "created category matches",
    createdConfig.category,
    originalCategory,
  );
  TestValidator.equals(
    "created status matches",
    createdConfig.status,
    originalStatus,
  );
  TestValidator.equals(
    "created is_sensitive matches",
    createdConfig.is_sensitive,
    originalIsSensitive,
  );

  // Step 3: Perform partial update - modify only description and status
  const newDescription =
    "This is the NEW updated description after partial update";
  const newStatus = "inactive" as const;

  const updatedConfig: IShoppingMallSystemConfig =
    await api.functional.shoppingMall.admin.systemConfigs.update(connection, {
      configKey: originalConfigKey,
      body: {
        description: newDescription,
        status: newStatus,
      } satisfies IShoppingMallSystemConfig.IUpdate,
    });
  typia.assert(updatedConfig);

  // Step 4: Validate that updated fields reflect new values
  TestValidator.equals(
    "updated description reflects new value",
    updatedConfig.description,
    newDescription,
  );
  TestValidator.equals(
    "updated status reflects new value",
    updatedConfig.status,
    newStatus,
  );

  // Step 5: Validate that unchanged fields retain original values
  TestValidator.equals(
    "config_key remains unchanged",
    updatedConfig.config_key,
    originalConfigKey,
  );
  TestValidator.equals(
    "config_value remains unchanged",
    updatedConfig.config_value,
    originalConfigValue,
  );
  TestValidator.equals(
    "value_type remains unchanged",
    updatedConfig.value_type,
    originalValueType,
  );
  TestValidator.equals(
    "category remains unchanged",
    updatedConfig.category,
    originalCategory,
  );
  TestValidator.equals(
    "is_sensitive remains unchanged",
    updatedConfig.is_sensitive,
    originalIsSensitive,
  );

  // Step 6: Validate immutable fields remain the same
  TestValidator.equals(
    "id remains unchanged",
    updatedConfig.id,
    createdConfig.id,
  );
  TestValidator.equals(
    "created_at remains unchanged",
    updatedConfig.created_at,
    createdConfig.created_at,
  );

  // Step 7: Validate that updated_at timestamp is modified
  TestValidator.predicate(
    "updated_at timestamp is modified",
    updatedConfig.updated_at !== createdConfig.updated_at,
  );
}
