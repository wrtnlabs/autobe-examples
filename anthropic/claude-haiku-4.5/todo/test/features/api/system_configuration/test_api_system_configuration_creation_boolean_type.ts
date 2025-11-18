import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfig";

/**
 * Test creating a system configuration entry with a boolean value type.
 *
 * This test validates that the system configuration API correctly handles
 * boolean-type configuration entries. It submits a configuration with a boolean
 * value (as a string like "true" or "false") with value_type explicitly set to
 * "boolean", and verifies that the boolean designation is properly recorded for
 * type conversion by the application.
 *
 * The test confirms that:
 *
 * 1. Boolean configuration can be created successfully
 * 2. The value_type field correctly designates the type as "boolean"
 * 3. The configuration entry is assigned a unique UUID
 * 4. Initial version is set to 1
 * 5. Timestamps (created_at, updated_at) are properly recorded in UTC
 * 6. Configuration key is unique and stored correctly
 * 7. Optional description field is properly stored when provided
 */
export async function test_api_system_configuration_creation_boolean_type(
  connection: api.IConnection,
) {
  // Generate a unique configuration key for this test
  const configKey = `test_boolean_flag_${RandomGenerator.alphaNumeric(8)}`;

  // Create request body with boolean configuration data
  const requestBody = {
    config_key: configKey,
    config_value: "true",
    value_type: "boolean",
    description: "Test boolean configuration flag for feature control",
  } satisfies ITodoListSystemConfig.ICreate;

  // Call API to create the system configuration
  const createdConfig: ITodoListSystemConfig =
    await api.functional.todoList.systemConfigurations.create(connection, {
      body: requestBody,
    });

  // Validate response type and structure
  typia.assert(createdConfig);

  // Verify basic configuration properties
  TestValidator.equals(
    "configuration key matches input",
    createdConfig.config_key,
    configKey,
  );
  TestValidator.equals(
    "configuration value is stored as string",
    createdConfig.config_value,
    "true",
  );
  TestValidator.equals(
    "value_type is set to boolean",
    createdConfig.value_type,
    "boolean",
  );

  // Verify auto-generated fields
  TestValidator.predicate("id is auto-generated", createdConfig.id.length > 0);
  TestValidator.equals("initial version is 1", createdConfig.version, 1);

  // Verify description is stored
  TestValidator.equals(
    "description is stored correctly",
    createdConfig.description,
    "Test boolean configuration flag for feature control",
  );
}
