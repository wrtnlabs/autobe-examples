import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfig";

/**
 * Test configuration organizational structure by updating category field.
 *
 * This test validates that system configurations can be reassigned to different
 * functional categories, enabling administrators to organize settings by domain
 * as the system evolves. The test creates a configuration in one category and
 * then updates it to a different category, verifying the reassignment succeeds
 * while preserving all other configuration properties.
 *
 * Steps:
 *
 * 1. Create and authenticate an administrator account
 * 2. Create a system configuration in the 'platform' category
 * 3. Update the configuration to reassign it to the 'payment' category
 * 4. Validate the category field was successfully updated
 * 5. Verify all other properties remain unchanged during reassignment
 */
export async function test_api_system_config_update_category_reassignment(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();

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

  // Step 2: Create initial configuration in 'platform' category
  const initialConfigKey = `test_config_${RandomGenerator.alphaNumeric(8)}`;
  const initialConfigValue = RandomGenerator.alphaNumeric(16);

  const createdConfig =
    await api.functional.shoppingMall.admin.systemConfigs.create(connection, {
      body: {
        config_key: initialConfigKey,
        config_value: initialConfigValue,
        value_type: "string",
        description: RandomGenerator.paragraph({ sentences: 2 }),
        category: "platform",
        status: "active",
        is_sensitive: false,
      } satisfies IShoppingMallSystemConfig.ICreate,
    });
  typia.assert(createdConfig);

  // Step 3: Update configuration to reassign to 'payment' category
  const updatedConfig =
    await api.functional.shoppingMall.admin.systemConfigs.update(connection, {
      configKey: initialConfigKey,
      body: {
        category: "payment",
      } satisfies IShoppingMallSystemConfig.IUpdate,
    });
  typia.assert(updatedConfig);

  // Step 4: Validate category was successfully updated
  TestValidator.equals(
    "category should be reassigned to payment",
    updatedConfig.category,
    "payment",
  );

  // Step 5: Verify all other properties remain unchanged
  TestValidator.equals(
    "config_key should remain unchanged",
    updatedConfig.config_key,
    initialConfigKey,
  );

  TestValidator.equals(
    "config_value should remain unchanged",
    updatedConfig.config_value,
    initialConfigValue,
  );

  TestValidator.equals(
    "value_type should remain unchanged",
    updatedConfig.value_type,
    createdConfig.value_type,
  );

  TestValidator.equals(
    "status should remain unchanged",
    updatedConfig.status,
    createdConfig.status,
  );

  TestValidator.equals(
    "is_sensitive should remain unchanged",
    updatedConfig.is_sensitive,
    createdConfig.is_sensitive,
  );
}
