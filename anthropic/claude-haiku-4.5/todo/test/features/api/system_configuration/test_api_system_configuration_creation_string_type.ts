import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfig";

/**
 * Test creating a system configuration entry with a string value type.
 *
 * This test validates that a new configuration entry is successfully created
 * with a unique config_key, string config_value, and string value_type
 * designation. The test verifies that the system generates a UUID id, sets
 * version to 1, records created_at and updated_at timestamps in UTC, and
 * returns the complete configuration entry object with all required fields
 * populated correctly.
 *
 * **Test Workflow:**
 *
 * 1. Prepare string configuration data with unique key and descriptive metadata
 * 2. Create the configuration entry via API
 * 3. Validate response contains all required fields with proper types and values
 * 4. Verify all input values are preserved in the created configuration
 * 5. Confirm version is initialized to 1 and timestamps are properly recorded
 */
export async function test_api_system_configuration_creation_string_type(
  connection: api.IConnection,
) {
  // Step 1: Prepare configuration data
  const configKey = `deployment_environment_${RandomGenerator.alphaNumeric(8)}`;
  const configValue = RandomGenerator.pick([
    "development",
    "staging",
    "production",
    "test",
  ] as const);
  const description = `Configuration for ${configValue} environment deployment settings`;

  // Step 2: Create system configuration entry
  const config: ITodoListSystemConfig =
    await api.functional.todoList.systemConfigurations.create(connection, {
      body: {
        config_key: configKey,
        config_value: configValue,
        value_type: "string",
        description: description,
      } satisfies ITodoListSystemConfig.ICreate,
    });

  // Step 3: Validate response type safety and structure
  typia.assert(config);

  // Step 4: Verify version is set to 1 for new configuration
  TestValidator.equals(
    "version should be 1 for newly created configuration",
    config.version,
    1,
  );

  // Step 5: Verify config_key matches input value
  TestValidator.equals(
    "config_key should match input value",
    config.config_key,
    configKey,
  );

  // Step 6: Verify config_value matches input value
  TestValidator.equals(
    "config_value should match input value",
    config.config_value,
    configValue,
  );

  // Step 7: Verify value_type is 'string'
  TestValidator.equals(
    "value_type should be 'string'",
    config.value_type,
    "string",
  );

  // Step 8: Verify description matches input value
  TestValidator.equals(
    "description should match input value",
    config.description,
    description,
  );

  // Step 9: Verify id is present and non-empty
  TestValidator.predicate(
    "id should be present and non-empty",
    config.id && config.id.length > 0,
  );

  // Step 10: Verify timestamps are not in the future
  const now = new Date();
  const createdAtDate = new Date(config.created_at);
  const updatedAtDate = new Date(config.updated_at);

  TestValidator.predicate(
    "created_at should not be in the future",
    createdAtDate <= now,
  );

  TestValidator.predicate(
    "updated_at should not be in the future",
    updatedAtDate <= now,
  );

  // Step 11: Verify created_at and updated_at are equal for new configuration
  TestValidator.equals(
    "created_at and updated_at should be equal for new configuration",
    config.created_at,
    config.updated_at,
  );
}
