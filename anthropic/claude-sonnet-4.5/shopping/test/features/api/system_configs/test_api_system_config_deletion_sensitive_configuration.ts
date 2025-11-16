import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfig";

/**
 * Test deletion of sensitive system configuration containing protected
 * credential data.
 *
 * This test validates the secure deletion workflow for system configurations
 * marked as sensitive (is_sensitive: true). The scenario creates an admin
 * account, authenticates, creates a sensitive configuration entry containing
 * simulated API credentials, then deletes it to verify proper handling of
 * security-flagged configurations.
 *
 * Process:
 *
 * 1. Create and authenticate administrator account
 * 2. Create sensitive system configuration with credential data
 * 3. Delete the sensitive configuration
 * 4. Validate successful deletion and proper handling of sensitive data
 */
export async function test_api_system_config_deletion_sensitive_configuration(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
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

  // Step 2: Create sensitive system configuration with credential data
  const configKey = `payment_gateway_api_key_${RandomGenerator.alphaNumeric(8)}`;
  const sensitiveConfig: IShoppingMallSystemConfig =
    await api.functional.shoppingMall.admin.systemConfigs.create(connection, {
      body: {
        config_key: configKey,
        config_value: `sk_live_${RandomGenerator.alphaNumeric(32)}`,
        value_type: "string",
        description:
          "Payment gateway API secret key for production environment",
        category: "payment",
        status: "active",
        is_sensitive: true,
      } satisfies IShoppingMallSystemConfig.ICreate,
    });
  typia.assert(sensitiveConfig);

  // Validate the created sensitive configuration
  TestValidator.equals(
    "config key matches",
    sensitiveConfig.config_key,
    configKey,
  );
  TestValidator.equals(
    "is marked as sensitive",
    sensitiveConfig.is_sensitive,
    true,
  );
  TestValidator.equals(
    "category is payment",
    sensitiveConfig.category,
    "payment",
  );
  TestValidator.equals("status is active", sensitiveConfig.status, "active");

  // Step 3: Delete the sensitive configuration
  const deletedConfig: IShoppingMallSystemConfig =
    await api.functional.shoppingMall.admin.systemConfigs.erase(connection, {
      configKey: sensitiveConfig.config_key,
    });
  typia.assert(deletedConfig);

  // Step 4: Validate successful deletion
  TestValidator.equals(
    "deleted config ID matches",
    deletedConfig.id,
    sensitiveConfig.id,
  );
  TestValidator.equals(
    "deleted config key matches",
    deletedConfig.config_key,
    sensitiveConfig.config_key,
  );
  TestValidator.equals(
    "deleted config was sensitive",
    deletedConfig.is_sensitive,
    true,
  );
}
