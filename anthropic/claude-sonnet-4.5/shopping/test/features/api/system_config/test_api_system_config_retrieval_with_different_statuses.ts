import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfig";

/**
 * Test the retrieval of system configurations with different status values to
 * ensure status information is correctly returned.
 *
 * This test validates that:
 *
 * 1. Administrators can create configurations with both 'active' and 'inactive'
 *    statuses
 * 2. Configurations can be retrieved by their config_key
 * 3. The retrieved configurations correctly reflect their status field
 * 4. This enables administrators to determine whether a configuration is currently
 *    in effect or temporarily disabled
 *
 * Test flow:
 *
 * 1. Authenticate as administrator
 * 2. Create a system configuration with 'active' status
 * 3. Create a system configuration with 'inactive' status
 * 4. Retrieve the active configuration and validate its status
 * 5. Retrieve the inactive configuration and validate its status
 */
export async function test_api_system_config_retrieval_with_different_statuses(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin",
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create a system configuration with 'active' status
  const activeConfigKey = `config_active_${RandomGenerator.alphaNumeric(8)}`;
  const activeConfig =
    await api.functional.shoppingMall.admin.systemConfigs.create(connection, {
      body: {
        config_key: activeConfigKey,
        config_value: "active_value_123",
        value_type: "string",
        description: "This is an active configuration for testing",
        category: "platform",
        status: "active",
        is_sensitive: false,
      } satisfies IShoppingMallSystemConfig.ICreate,
    });
  typia.assert(activeConfig);

  // Step 3: Create a system configuration with 'inactive' status
  const inactiveConfigKey = `config_inactive_${RandomGenerator.alphaNumeric(8)}`;
  const inactiveConfig =
    await api.functional.shoppingMall.admin.systemConfigs.create(connection, {
      body: {
        config_key: inactiveConfigKey,
        config_value: "inactive_value_456",
        value_type: "string",
        description: "This is an inactive configuration for testing",
        category: "security",
        status: "inactive",
        is_sensitive: false,
      } satisfies IShoppingMallSystemConfig.ICreate,
    });
  typia.assert(inactiveConfig);

  // Step 4: Retrieve the active configuration and validate its status
  const retrievedActiveConfig =
    await api.functional.shoppingMall.admin.systemConfigs.at(connection, {
      configKey: activeConfigKey,
    });
  typia.assert(retrievedActiveConfig);

  TestValidator.equals(
    "active config ID should match",
    retrievedActiveConfig.id,
    activeConfig.id,
  );
  TestValidator.equals(
    "active config key should match",
    retrievedActiveConfig.config_key,
    activeConfigKey,
  );
  TestValidator.equals(
    "active config status should be 'active'",
    retrievedActiveConfig.status,
    "active",
  );
  TestValidator.equals(
    "active config value should match",
    retrievedActiveConfig.config_value,
    "active_value_123",
  );

  // Step 5: Retrieve the inactive configuration and validate its status
  const retrievedInactiveConfig =
    await api.functional.shoppingMall.admin.systemConfigs.at(connection, {
      configKey: inactiveConfigKey,
    });
  typia.assert(retrievedInactiveConfig);

  TestValidator.equals(
    "inactive config ID should match",
    retrievedInactiveConfig.id,
    inactiveConfig.id,
  );
  TestValidator.equals(
    "inactive config key should match",
    retrievedInactiveConfig.config_key,
    inactiveConfigKey,
  );
  TestValidator.equals(
    "inactive config status should be 'inactive'",
    retrievedInactiveConfig.status,
    "inactive",
  );
  TestValidator.equals(
    "inactive config value should match",
    retrievedInactiveConfig.config_value,
    "inactive_value_456",
  );
}
