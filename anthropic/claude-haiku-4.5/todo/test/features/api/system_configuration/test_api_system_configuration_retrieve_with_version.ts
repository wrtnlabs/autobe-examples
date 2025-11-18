import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfig";

/**
 * Test that retrieved configuration includes correct version number.
 *
 * This test validates that when a system configuration entry is created, it is
 * automatically assigned version=1 on creation. When the configuration is
 * retrieved by its key, the response must include the correct version number.
 * This ensures that version tracking is properly initialized and returned by
 * the API.
 *
 * Test workflow:
 *
 * 1. Create a new system configuration entry with random key, value, and type
 * 2. Retrieve the created configuration by its key
 * 3. Validate that the retrieved configuration has version=1
 * 4. Confirm all other fields match what was created
 */
export async function test_api_system_configuration_retrieve_with_version(
  connection: api.IConnection,
) {
  // Step 1: Create a new system configuration entry
  const configKey = `test_config_${RandomGenerator.alphaNumeric(8)}`;
  const createBody = {
    config_key: configKey,
    config_value: RandomGenerator.paragraph(),
    value_type: RandomGenerator.pick([
      "string",
      "integer",
      "boolean",
      "float",
    ] as const),
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ITodoListSystemConfig.ICreate;

  const createdConfig =
    await api.functional.todoList.systemConfigurations.create(connection, {
      body: createBody,
    });
  typia.assert(createdConfig);

  // Step 2: Validate that created config has version=1
  TestValidator.equals(
    "created configuration should have version=1",
    createdConfig.version,
    1,
  );
  TestValidator.equals(
    "created configuration config_key should match",
    createdConfig.config_key,
    configKey,
  );
  TestValidator.equals(
    "created configuration config_value should match",
    createdConfig.config_value,
    createBody.config_value,
  );
  TestValidator.equals(
    "created configuration value_type should match",
    createdConfig.value_type,
    createBody.value_type,
  );

  // Step 3: Retrieve the configuration by its key
  const retrievedConfig = await api.functional.todoList.systemConfigurations.at(
    connection,
    {
      configKey: configKey,
    },
  );
  typia.assert(retrievedConfig);

  // Step 4: Validate the retrieved configuration has correct version and matches created config
  TestValidator.equals(
    "retrieved configuration should have version=1",
    retrievedConfig.version,
    1,
  );
  TestValidator.equals(
    "retrieved configuration should match created configuration",
    retrievedConfig,
    createdConfig,
  );
  TestValidator.equals(
    "retrieved config_key should match",
    retrievedConfig.config_key,
    configKey,
  );
  TestValidator.equals(
    "retrieved config_value should match created value",
    retrievedConfig.config_value,
    createBody.config_value,
  );
  TestValidator.equals(
    "retrieved value_type should match created type",
    retrievedConfig.value_type,
    createBody.value_type,
  );
}
