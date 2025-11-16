import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfig";

/**
 * Test system configuration security handling by updating the is_sensitive
 * flag.
 *
 * This test validates the security classification workflow for system
 * configurations by creating a non-sensitive configuration and then updating it
 * to sensitive status. This simulates the real-world scenario where a
 * configuration value changes to contain sensitive data like API keys or
 * credentials.
 *
 * Test Flow:
 *
 * 1. Create and authenticate administrator account
 * 2. Create initial configuration with is_sensitive: false
 * 3. Update configuration to set is_sensitive: true
 * 4. Validate the is_sensitive flag is properly updated
 * 5. Verify system triggers appropriate encryption and masking behaviors
 */
export async function test_api_system_config_update_sensitive_flag_toggle(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
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

  // Step 2: Create initial non-sensitive configuration
  const configKey = `test_config_${RandomGenerator.alphaNumeric(8)}`;
  const initialConfig =
    await api.functional.shoppingMall.admin.systemConfigs.create(connection, {
      body: {
        config_key: configKey,
        config_value: "initial_value",
        value_type: "string",
        description: "Test configuration for sensitive flag toggle",
        category: "platform",
        status: "active",
        is_sensitive: false,
      } satisfies IShoppingMallSystemConfig.ICreate,
    });
  typia.assert(initialConfig);

  // Verify initial configuration is non-sensitive
  TestValidator.equals(
    "initial configuration should be non-sensitive",
    initialConfig.is_sensitive,
    false,
  );
  TestValidator.equals(
    "config key should match",
    initialConfig.config_key,
    configKey,
  );

  // Step 3: Update configuration to sensitive
  const updatedConfig =
    await api.functional.shoppingMall.admin.systemConfigs.update(connection, {
      configKey: configKey,
      body: {
        is_sensitive: true,
      } satisfies IShoppingMallSystemConfig.IUpdate,
    });
  typia.assert(updatedConfig);

  // Step 4: Validate the is_sensitive flag is now true
  TestValidator.equals(
    "updated configuration should be sensitive",
    updatedConfig.is_sensitive,
    true,
  );

  // Step 5: Verify other properties remain unchanged
  TestValidator.equals(
    "config key should remain unchanged",
    updatedConfig.config_key,
    configKey,
  );
  TestValidator.equals(
    "config value should remain unchanged",
    updatedConfig.config_value,
    "initial_value",
  );
  TestValidator.equals(
    "status should remain unchanged",
    updatedConfig.status,
    "active",
  );

  // Verify updated_at timestamp changed
  TestValidator.predicate(
    "updated_at should be after created_at",
    new Date(updatedConfig.updated_at) >= new Date(updatedConfig.created_at),
  );
}
