import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfig";

/**
 * Tests creating a system configuration entry with boolean value_type.
 *
 * This test validates that the system configuration API correctly handles
 * creation of configuration entries with boolean type designation. It submits a
 * request with a unique configuration key, a boolean value (as string),
 * value_type designation as 'boolean', and an optional description. The test
 * verifies that the entry is created with proper type designation and that the
 * boolean value is stored and returned correctly.
 *
 * The test ensures that:
 *
 * 1. Configuration entries can be created with boolean value_type
 * 2. Boolean values are properly stored as strings ('true' or 'false')
 * 3. The system assigns a unique UUID id to the new entry
 * 4. Version number is initialized to 1
 * 5. Created and modified timestamps are automatically set
 * 6. The response matches the expected ITodoListSystemConfig type structure
 */
export async function test_api_system_configuration_create_boolean_type(
  connection: api.IConnection,
) {
  // Generate test data for boolean configuration
  const configKey = `enable_feature_flag_${RandomGenerator.alphaNumeric(8)}`;
  const booleanValue = RandomGenerator.pick(["true", "false"]);
  const description = RandomGenerator.paragraph({ sentences: 2 });

  // Create system configuration with boolean type
  const config: ITodoListSystemConfig =
    await api.functional.todoList.systemConfigurations.create(connection, {
      body: {
        config_key: configKey,
        config_value: booleanValue,
        value_type: "boolean",
        description: description,
      } satisfies ITodoListSystemConfig.ICreate,
    });

  // Validate the response - typia.assert performs complete type validation
  typia.assert(config);

  // Verify the configuration key matches
  TestValidator.equals("config key matches", config.config_key, configKey);

  // Verify the boolean value is stored correctly as string
  TestValidator.equals(
    "config value matches",
    config.config_value,
    booleanValue,
  );

  // Verify value_type is designated as boolean
  TestValidator.equals("value_type is boolean", config.value_type, "boolean");

  // Verify description is stored correctly
  TestValidator.equals("description matches", config.description, description);

  // Verify initial version is 1
  TestValidator.equals("initial version is 1", config.version, 1);
}
