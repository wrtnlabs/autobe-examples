import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfig";

/**
 * Creates a feature flag configuration entry in the system configuration.
 *
 * This test validates the creation of a feature flag configuration with a
 * boolean type. Feature flags allow operations teams to enable or disable
 * features without code deployment. The test creates a configuration entry with
 * key 'enable_feature_flag_xyz' and value 'true', verifies the API response
 * contains all required fields, and validates that the system automatically
 * assigns an ID, version number 1, and proper timestamps in UTC.
 *
 * Steps:
 *
 * 1. Prepare feature flag configuration data with unique key, string value 'true',
 *    and type 'boolean'
 * 2. Call the POST /todoList/systemConfigurations endpoint to create the
 *    configuration
 * 3. Validate the response contains all expected properties with correct types
 * 4. Verify the configuration has a UUID identifier
 * 5. Confirm the version is initialized to 1
 * 6. Check timestamps are in ISO 8601 format
 */
export async function test_api_system_configuration_creation_feature_flag(
  connection: api.IConnection,
) {
  // Prepare feature flag configuration data
  const configKey = `enable_feature_flag_${RandomGenerator.alphaNumeric(8)}`;
  const configValue = "true";
  const valueType: "boolean" = "boolean";
  const description =
    "Feature flag to enable or disable feature without code deployment";

  // Create the feature flag configuration
  const createdConfig: ITodoListSystemConfig =
    await api.functional.todoList.systemConfigurations.create(connection, {
      body: {
        config_key: configKey,
        config_value: configValue,
        value_type: valueType,
        description: description,
      } satisfies ITodoListSystemConfig.ICreate,
    });

  // Validate the response
  typia.assert(createdConfig);

  // Verify configuration key matches
  TestValidator.equals(
    "configuration key should match request",
    createdConfig.config_key,
    configKey,
  );

  // Verify configuration value matches
  TestValidator.equals(
    "configuration value should match request",
    createdConfig.config_value,
    configValue,
  );

  // Verify value type is boolean
  TestValidator.equals(
    "value type should be boolean",
    createdConfig.value_type,
    valueType,
  );

  // Verify description matches
  TestValidator.equals(
    "description should match request",
    createdConfig.description,
    description,
  );

  // Verify initial version is 1
  TestValidator.equals("initial version should be 1", createdConfig.version, 1);

  // Verify created_at and updated_at are the same for new configuration
  TestValidator.equals(
    "created_at and updated_at should be equal for new configuration",
    createdConfig.created_at,
    createdConfig.updated_at,
  );
}
