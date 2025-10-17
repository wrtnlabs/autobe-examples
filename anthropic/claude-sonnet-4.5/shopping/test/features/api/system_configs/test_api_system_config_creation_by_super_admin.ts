import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfig";

/**
 * Test that administrators can successfully create new platform-wide system
 * configuration settings.
 *
 * This test validates the complete workflow of creating system configuration
 * entries by super admin users. The workflow includes admin authentication and
 * system configuration creation with proper validation.
 *
 * Steps:
 *
 * 1. Create and authenticate a super admin account
 * 2. Create a new system configuration with key-value pair
 * 3. Validate the created configuration response
 */
export async function test_api_system_config_creation_by_super_admin(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate super admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminName = RandomGenerator.name();

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: adminName,
        role_level: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Validate admin authentication response
  TestValidator.equals("admin email matches", admin.email, adminEmail);
  TestValidator.equals("admin name matches", admin.name, adminName);
  TestValidator.equals(
    "admin role is super_admin",
    admin.role_level,
    "super_admin",
  );

  // Step 2: Create system configuration
  const configKey = `platform.test.${RandomGenerator.alphaNumeric(8)}`;
  const configValue = RandomGenerator.alphaNumeric(16);

  const systemConfig: IShoppingMallSystemConfig =
    await api.functional.shoppingMall.admin.systemConfigs.create(connection, {
      body: {
        config_key: configKey,
        config_value: configValue,
      } satisfies IShoppingMallSystemConfig.ICreate,
    });
  typia.assert(systemConfig);

  // Step 3: Validate created system configuration
  TestValidator.equals(
    "config key matches",
    systemConfig.config_key,
    configKey,
  );
  TestValidator.equals(
    "config value matches",
    systemConfig.config_value,
    configValue,
  );
}
