import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfig";

/**
 * Test the retrieval of a system configuration marked as sensitive to validate
 * that sensitive data handling is properly indicated.
 *
 * This test validates the complete lifecycle of a sensitive system
 * configuration:
 *
 * 1. Administrator authentication with system configuration management permissions
 * 2. Creation of a configuration with is_sensitive flag set to true
 * 3. Retrieval of the configuration by config_key
 * 4. Validation that the is_sensitive flag is correctly preserved and returned
 *
 * The test ensures that sensitive configurations (containing API keys,
 * credentials, or other confidential data) are properly flagged throughout
 * their lifecycle, enabling the application layer to apply appropriate security
 * measures such as masking in admin interfaces, additional access controls, or
 * encryption at rest.
 */
export async function test_api_system_config_retrieval_for_sensitive_data(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminData = {
    email: adminEmail,
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: "super_admin" as const,
    email_verified: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 2: Create a sensitive system configuration
  const configKey = `api_key_${RandomGenerator.alphaNumeric(12)}`;
  const sensitiveConfigData = {
    config_key: configKey,
    config_value: `sk_live_${RandomGenerator.alphaNumeric(32)}`,
    value_type: "string",
    description:
      "Sensitive API key for third-party payment gateway integration. Must be kept confidential and encrypted at rest.",
    category: "payment" as const,
    status: "active" as const,
    is_sensitive: true,
  } satisfies IShoppingMallSystemConfig.ICreate;

  const createdConfig: IShoppingMallSystemConfig =
    await api.functional.shoppingMall.admin.systemConfigs.create(connection, {
      body: sensitiveConfigData,
    });
  typia.assert(createdConfig);

  // Step 3: Retrieve the configuration by config_key
  const retrievedConfig: IShoppingMallSystemConfig =
    await api.functional.shoppingMall.admin.systemConfigs.at(connection, {
      configKey: configKey,
    });
  typia.assert(retrievedConfig);

  // Step 4: Validate that the sensitive flag is correctly preserved
  TestValidator.equals(
    "retrieved config ID matches created config",
    retrievedConfig.id,
    createdConfig.id,
  );

  TestValidator.equals(
    "retrieved config key matches created config",
    retrievedConfig.config_key,
    configKey,
  );

  TestValidator.equals(
    "is_sensitive flag is true for sensitive configuration",
    retrievedConfig.is_sensitive,
    true,
  );

  TestValidator.equals(
    "config value is preserved correctly",
    retrievedConfig.config_value,
    sensitiveConfigData.config_value,
  );

  TestValidator.equals(
    "config category is correct",
    retrievedConfig.category,
    "payment",
  );

  TestValidator.equals(
    "config status is active",
    retrievedConfig.status,
    "active",
  );

  // Validate that the configuration metadata is complete
  TestValidator.predicate(
    "configuration has created_at timestamp",
    retrievedConfig.created_at !== null &&
      retrievedConfig.created_at !== undefined,
  );

  TestValidator.predicate(
    "configuration has updated_at timestamp",
    retrievedConfig.updated_at !== null &&
      retrievedConfig.updated_at !== undefined,
  );
}
