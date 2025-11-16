import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfig";

/**
 * Test the retrieval of a specific system configuration by its unique
 * config_key identifier.
 *
 * This test validates the complete workflow of system configuration retrieval:
 *
 * 1. Administrator authentication - Create and authenticate an admin account
 * 2. Configuration creation - Create a system configuration with a specific
 *    config_key
 * 3. Configuration retrieval - Retrieve the configuration using the config_key
 * 4. Comprehensive validation - Verify all fields are properly populated
 *
 * The test ensures administrators can query configurations by unique key to
 * verify current platform settings before making changes or understand feature
 * configurations.
 */
export async function test_api_system_config_retrieval_by_unique_key(
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

  // Step 2: Create a system configuration with a specific config_key
  const configKey = `test_config_${RandomGenerator.alphaNumeric(8)}`;
  const createData = {
    config_key: configKey,
    config_value: "15.5",
    value_type: "decimal",
    description:
      "Default commission rate for platform transactions in percentage",
    category: "commission",
    status: "active",
    is_sensitive: false,
  } satisfies IShoppingMallSystemConfig.ICreate;

  const createdConfig: IShoppingMallSystemConfig =
    await api.functional.shoppingMall.admin.systemConfigs.create(connection, {
      body: createData,
    });
  typia.assert(createdConfig);

  // Validate created configuration matches input data
  TestValidator.equals(
    "config_key matches",
    createdConfig.config_key,
    configKey,
  );
  TestValidator.equals(
    "config_value matches",
    createdConfig.config_value,
    createData.config_value,
  );
  TestValidator.equals(
    "value_type matches",
    createdConfig.value_type,
    createData.value_type,
  );
  TestValidator.equals(
    "description matches",
    createdConfig.description,
    createData.description,
  );
  TestValidator.equals(
    "category matches",
    createdConfig.category,
    createData.category,
  );
  TestValidator.equals(
    "status matches",
    createdConfig.status,
    createData.status,
  );
  TestValidator.equals(
    "is_sensitive matches",
    createdConfig.is_sensitive,
    createData.is_sensitive,
  );

  // Step 3: Retrieve the configuration by config_key
  const retrievedConfig: IShoppingMallSystemConfig =
    await api.functional.shoppingMall.admin.systemConfigs.at(connection, {
      configKey: configKey,
    });
  typia.assert(retrievedConfig);

  // Step 4: Comprehensive validation of retrieved configuration
  TestValidator.equals(
    "retrieved id matches created id",
    retrievedConfig.id,
    createdConfig.id,
  );
  TestValidator.equals(
    "retrieved config_key matches",
    retrievedConfig.config_key,
    configKey,
  );
  TestValidator.equals(
    "retrieved config_value matches",
    retrievedConfig.config_value,
    createData.config_value,
  );
  TestValidator.equals(
    "retrieved value_type matches",
    retrievedConfig.value_type,
    createData.value_type,
  );
  TestValidator.equals(
    "retrieved description matches",
    retrievedConfig.description,
    createData.description,
  );
  TestValidator.equals(
    "retrieved category matches",
    retrievedConfig.category,
    createData.category,
  );
  TestValidator.equals(
    "retrieved status matches",
    retrievedConfig.status,
    createData.status,
  );
  TestValidator.equals(
    "retrieved is_sensitive matches",
    retrievedConfig.is_sensitive,
    createData.is_sensitive,
  );
  TestValidator.equals(
    "retrieved created_at matches",
    retrievedConfig.created_at,
    createdConfig.created_at,
  );
  TestValidator.equals(
    "retrieved updated_at matches",
    retrievedConfig.updated_at,
    createdConfig.updated_at,
  );
  TestValidator.equals(
    "retrieved deleted_at matches",
    retrievedConfig.deleted_at,
    createdConfig.deleted_at,
  );
}
