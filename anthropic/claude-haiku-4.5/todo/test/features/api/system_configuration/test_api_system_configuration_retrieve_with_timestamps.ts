import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfig";

export async function test_api_system_configuration_retrieve_with_timestamps(
  connection: api.IConnection,
) {
  // Step 1: Create a system configuration entry
  const configKey = `test_config_${RandomGenerator.alphaNumeric(8)}`;
  const createdConfig =
    await api.functional.todoList.systemConfigurations.create(connection, {
      body: {
        config_key: configKey,
        config_value: "test_value_123",
        value_type: "string",
        description: "Test configuration for timestamp validation",
      } satisfies ITodoListSystemConfig.ICreate,
    });
  typia.assert(createdConfig);

  // Step 2: Validate that created configuration has correct timestamp fields
  TestValidator.predicate(
    "created configuration has created_at timestamp",
    createdConfig.created_at !== null && createdConfig.created_at !== undefined,
  );
  TestValidator.predicate(
    "created configuration has updated_at timestamp",
    createdConfig.updated_at !== null && createdConfig.updated_at !== undefined,
  );

  // Step 3: Validate timestamp format is ISO 8601
  const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
  TestValidator.predicate(
    "created_at is in ISO 8601 format",
    iso8601Regex.test(createdConfig.created_at),
  );
  TestValidator.predicate(
    "updated_at is in ISO 8601 format",
    iso8601Regex.test(createdConfig.updated_at),
  );

  // Step 4: Retrieve the configuration entry by key
  const retrievedConfig = await api.functional.todoList.systemConfigurations.at(
    connection,
    {
      configKey: configKey,
    },
  );
  typia.assert(retrievedConfig);

  // Step 5: Validate retrieved configuration has timestamps
  TestValidator.predicate(
    "retrieved configuration has created_at timestamp",
    retrievedConfig.created_at !== null &&
      retrievedConfig.created_at !== undefined,
  );
  TestValidator.predicate(
    "retrieved configuration has updated_at timestamp",
    retrievedConfig.updated_at !== null &&
      retrievedConfig.updated_at !== undefined,
  );

  // Step 6: Validate retrieved timestamps are in ISO 8601 format
  TestValidator.predicate(
    "retrieved created_at is in ISO 8601 format",
    iso8601Regex.test(retrievedConfig.created_at),
  );
  TestValidator.predicate(
    "retrieved updated_at is in ISO 8601 format",
    iso8601Regex.test(retrievedConfig.updated_at),
  );

  // Step 7: Validate timestamps match between created and retrieved
  TestValidator.equals(
    "retrieved created_at matches created configuration",
    retrievedConfig.created_at,
    createdConfig.created_at,
  );
  TestValidator.equals(
    "retrieved updated_at matches created configuration",
    retrievedConfig.updated_at,
    createdConfig.updated_at,
  );

  // Step 8: Validate retrieved config data matches creation input
  TestValidator.equals(
    "retrieved config_key matches",
    retrievedConfig.config_key,
    configKey,
  );
  TestValidator.equals(
    "retrieved config_value matches",
    retrievedConfig.config_value,
    "test_value_123",
  );
  TestValidator.equals(
    "retrieved value_type matches",
    retrievedConfig.value_type,
    "string",
  );
}
