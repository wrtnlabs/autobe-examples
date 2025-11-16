import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfig";

/**
 * Test the retrieval of a system configuration to validate that all metadata
 * fields are correctly populated and returned.
 *
 * This test ensures that configuration metadata provides complete context about
 * each setting's purpose, data type, and organizational classification,
 * supporting proper configuration management and documentation.
 *
 * Test Flow:
 *
 * 1. Register administrator account and authenticate
 * 2. Create a system configuration with comprehensive metadata
 * 3. Retrieve the configuration by config_key
 * 4. Validate all metadata fields match expected values including value_type,
 *    description, category, and timestamps
 */
export async function test_api_system_config_retrieval_with_metadata_validation(
  connection: api.IConnection,
) {
  // Step 1: Register administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Admin123!@#";

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
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

  // Step 2: Create a system configuration with comprehensive metadata
  const configKey = `test_config_${RandomGenerator.alphaNumeric(8)}`;
  const configValue = "true";
  const valueType = "boolean";
  const description =
    "This is a test configuration setting that controls feature X behavior. When enabled, the system will perform Y operation automatically.";
  const category = "features";
  const status = "active";
  const isSensitive = false;

  const createdConfig: IShoppingMallSystemConfig =
    await api.functional.shoppingMall.admin.systemConfigs.create(connection, {
      body: {
        config_key: configKey,
        config_value: configValue,
        value_type: valueType,
        description: description,
        category: category,
        status: status,
        is_sensitive: isSensitive,
      } satisfies IShoppingMallSystemConfig.ICreate,
    });
  typia.assert(createdConfig);

  // Step 3: Retrieve the configuration by config_key
  const retrievedConfig: IShoppingMallSystemConfig =
    await api.functional.shoppingMall.admin.systemConfigs.at(connection, {
      configKey: configKey,
    });
  typia.assert(retrievedConfig);

  // Step 4: Validate all metadata fields are correctly populated
  TestValidator.equals(
    "config_key matches",
    retrievedConfig.config_key,
    configKey,
  );
  TestValidator.equals(
    "config_value matches",
    retrievedConfig.config_value,
    configValue,
  );
  TestValidator.equals(
    "value_type matches for proper parsing guidance",
    retrievedConfig.value_type,
    valueType,
  );
  TestValidator.equals(
    "description is complete and accurate",
    retrievedConfig.description,
    description,
  );
  TestValidator.equals(
    "category is correctly classified",
    retrievedConfig.category,
    category,
  );
  TestValidator.equals(
    "status is correctly set",
    retrievedConfig.status,
    status,
  );
  TestValidator.equals(
    "is_sensitive flag matches",
    retrievedConfig.is_sensitive,
    isSensitive,
  );

  // Validate that created and retrieved configs have the same ID
  TestValidator.equals(
    "configuration ID matches",
    retrievedConfig.id,
    createdConfig.id,
  );
}
