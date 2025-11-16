import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfig";

/**
 * Test configuration deletion across different functional categories.
 *
 * This test validates that the system configuration deletion endpoint works
 * uniformly across all configuration categories (payment, shipping, email,
 * platform, commission, features, security). The test creates one configuration
 * in each category and then deletes them to ensure category assignment does not
 * affect deletion capability.
 *
 * Steps:
 *
 * 1. Create and authenticate an admin account
 * 2. Create 7 system configurations (one in each category)
 * 3. Delete each configuration using its config_key
 * 4. Validate that all deletions succeed regardless of category
 */
export async function test_api_system_config_deletion_multiple_categories(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "Admin123!@#",
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        admin_level: "super_admin",
        email_verified: true,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create configurations in all categories
  const categories = [
    "payment",
    "shipping",
    "email",
    "platform",
    "commission",
    "features",
    "security",
  ] as const;
  const createdConfigs: IShoppingMallSystemConfig[] = [];

  for (const category of categories) {
    const configKey = `${category}_${RandomGenerator.alphaNumeric(8)}`;
    const isSensitive = category === "payment" || category === "security";

    const config: IShoppingMallSystemConfig =
      await api.functional.shoppingMall.admin.systemConfigs.create(connection, {
        body: {
          config_key: configKey,
          config_value: RandomGenerator.alphaNumeric(16),
          value_type: "string",
          description: `Test configuration for ${category} category`,
          category: category,
          status: "active",
          is_sensitive: isSensitive,
        } satisfies IShoppingMallSystemConfig.ICreate,
      });
    typia.assert(config);
    createdConfigs.push(config);
  }

  // Step 3 & 4: Delete each configuration and validate
  for (const config of createdConfigs) {
    const deletedConfig: IShoppingMallSystemConfig =
      await api.functional.shoppingMall.admin.systemConfigs.erase(connection, {
        configKey: config.config_key,
      });
    typia.assert(deletedConfig);

    // Validate the deleted configuration matches the created one
    TestValidator.equals(
      "deleted config id matches",
      deletedConfig.id,
      config.id,
    );
    TestValidator.equals(
      "deleted config key matches",
      deletedConfig.config_key,
      config.config_key,
    );
    TestValidator.equals(
      "deleted config category matches",
      deletedConfig.category,
      config.category,
    );
  }
}
