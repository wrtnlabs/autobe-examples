import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfig";

/**
 * Test creating a system configuration entry with an integer value type.
 *
 * This test validates that the system correctly handles numeric values stored
 * as strings when the value_type is designated as 'integer'. It verifies that
 * the configuration entry is created with proper metadata including
 * auto-generated UUID, initial version number, and timestamps.
 *
 * Steps:
 *
 * 1. Create a system configuration with integer value type
 * 2. Verify the configuration is stored with proper type designation
 * 3. Validate all auto-generated metadata (id, version, timestamps)
 * 4. Confirm the response matches the expected structure
 */
export async function test_api_system_configuration_creation_integer_type(
  connection: api.IConnection,
) {
  // Create a system configuration with integer value type
  const configKey = `max_todos_per_user_${RandomGenerator.alphaNumeric(8)}`;
  const integerValue = "10000";
  const description = "Maximum number of todos per user";

  const config: ITodoListSystemConfig =
    await api.functional.todoList.systemConfigurations.create(connection, {
      body: {
        config_key: configKey,
        config_value: integerValue,
        value_type: "integer",
        description: description,
      } satisfies ITodoListSystemConfig.ICreate,
    });

  // Validate the response
  typia.assert(config);

  // Verify configuration key matches
  TestValidator.equals(
    "configuration key should match input",
    config.config_key,
    configKey,
  );

  // Verify configuration value matches
  TestValidator.equals(
    "configuration value should match input",
    config.config_value,
    integerValue,
  );

  // Verify value type is set to integer
  TestValidator.equals(
    "value type should be integer",
    config.value_type,
    "integer",
  );

  // Verify description matches
  TestValidator.equals(
    "description should match input",
    config.description,
    description,
  );

  // Verify id is a valid UUID string
  TestValidator.predicate(
    "id should be a valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      config.id,
    ),
  );

  // Verify version is initialized to 1
  TestValidator.equals("version should be initialized to 1", config.version, 1);

  // Verify created_at is a valid ISO 8601 date-time
  TestValidator.predicate(
    "created_at should be a valid ISO 8601 date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(config.created_at),
  );

  // Verify updated_at is a valid ISO 8601 date-time
  TestValidator.predicate(
    "updated_at should be a valid ISO 8601 date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(config.updated_at),
  );

  // Verify created_at and updated_at are the same (since just created)
  TestValidator.equals(
    "updated_at should equal created_at for newly created config",
    config.updated_at,
    config.created_at,
  );
}
