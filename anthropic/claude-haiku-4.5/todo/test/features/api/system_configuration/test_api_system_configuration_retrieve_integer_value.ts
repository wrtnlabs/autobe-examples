import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfig";

/**
 * Test retrieving a system configuration with integer value_type.
 *
 * This test validates the complete workflow for managing integer-type system
 * configurations. It demonstrates:
 *
 * 1. Creating a new integer configuration entry via POST
 * 2. Retrieving the configuration via GET using the config_key
 * 3. Validating the response structure and type designation
 * 4. Ensuring the configuration data matches expectations
 *
 * The test uses 'max_todos_per_user' as an example configuration key that would
 * typically control application limits and behavior settings.
 */
export async function test_api_system_configuration_retrieve_integer_value(
  connection: api.IConnection,
) {
  // Step 1: Create an integer-type system configuration
  const configKey = "max_todos_per_user";
  const configValue = "10000";

  const createdConfig =
    await api.functional.todoList.systemConfigurations.create(connection, {
      body: {
        config_key: configKey,
        config_value: configValue,
        value_type: "integer",
        description: "Maximum number of todos per user",
      } satisfies ITodoListSystemConfig.ICreate,
    });
  typia.assert(createdConfig);

  // Validate created configuration properties
  TestValidator.equals(
    "created config key matches",
    createdConfig.config_key,
    configKey,
  );
  TestValidator.equals(
    "created config value matches",
    createdConfig.config_value,
    configValue,
  );
  TestValidator.equals(
    "created config type is integer",
    createdConfig.value_type,
    "integer",
  );
  TestValidator.equals(
    "created config starts at version 1",
    createdConfig.version,
    1,
  );

  // Step 2: Retrieve the configuration using GET endpoint
  const retrievedConfig = await api.functional.todoList.systemConfigurations.at(
    connection,
    {
      configKey: configKey,
    },
  );
  typia.assert(retrievedConfig);

  // Step 3: Validate retrieved configuration matches created data
  TestValidator.equals(
    "retrieved config id matches created",
    retrievedConfig.id,
    createdConfig.id,
  );
  TestValidator.equals(
    "retrieved config key matches",
    retrievedConfig.config_key,
    configKey,
  );
  TestValidator.equals(
    "retrieved config value matches",
    retrievedConfig.config_value,
    configValue,
  );
  TestValidator.equals(
    "retrieved config type is integer",
    retrievedConfig.value_type,
    "integer",
  );
  TestValidator.equals(
    "retrieved config version matches",
    retrievedConfig.version,
    createdConfig.version,
  );
  TestValidator.equals(
    "retrieved config description matches",
    retrievedConfig.description,
    "Maximum number of todos per user",
  );
}
