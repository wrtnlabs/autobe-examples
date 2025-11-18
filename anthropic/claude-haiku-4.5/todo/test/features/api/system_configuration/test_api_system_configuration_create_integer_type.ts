import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfig";

/**
 * Test creating a system configuration entry with integer value_type.
 *
 * This test validates that the system configuration API correctly creates a new
 * configuration entry with the value_type set to 'integer'. The test creates a
 * configuration with a unique key, provides a string representation of an
 * integer value, and verifies that the response contains all expected fields
 * including the correct value_type designation, auto-generated ID, initial
 * version number, and timestamps.
 *
 * Test steps:
 *
 * 1. Generate test data for system configuration with integer value_type
 * 2. Create the configuration entry via API
 * 3. Validate that the response contains all required fields
 * 4. Verify that value_type is correctly set to 'integer'
 * 5. Confirm that the config_value can be parsed as an integer
 * 6. Verify that timestamps and version are correctly set
 */
export async function test_api_system_configuration_create_integer_type(
  connection: api.IConnection,
) {
  // Step 1: Prepare test data for integer configuration
  const configKey = `max_todos_per_user_${RandomGenerator.alphaNumeric(8)}`;
  const configValue = "10000";
  const description = RandomGenerator.paragraph({ sentences: 2 });

  // Step 2: Create system configuration with integer value_type
  const created: ITodoListSystemConfig =
    await api.functional.todoList.systemConfigurations.create(connection, {
      body: {
        config_key: configKey,
        config_value: configValue,
        value_type: "integer",
        description: description,
      } satisfies ITodoListSystemConfig.ICreate,
    });

  // Step 3: Validate the response structure with complete type validation
  typia.assert(created);

  // Step 4: Verify value_type is correctly set to 'integer'
  TestValidator.equals(
    "value_type should be set to 'integer'",
    created.value_type,
    "integer",
  );

  // Step 5: Verify config_key matches the input
  TestValidator.equals(
    "config_key should match input",
    created.config_key,
    configKey,
  );

  // Step 6: Verify config_value matches the input
  TestValidator.equals(
    "config_value should match input",
    created.config_value,
    configValue,
  );

  // Step 7: Verify that config_value can be parsed as integer
  const parsedValue = parseInt(created.config_value, 10);
  TestValidator.predicate(
    "config_value should be parseable as integer",
    !isNaN(parsedValue) && parsedValue === 10000,
  );

  // Step 8: Verify description is correctly stored
  TestValidator.equals(
    "description should match input",
    created.description,
    description,
  );

  // Step 9: Verify initial version is 1
  TestValidator.equals("initial version should be 1", created.version, 1);
}
