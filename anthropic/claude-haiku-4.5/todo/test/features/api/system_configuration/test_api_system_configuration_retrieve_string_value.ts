import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfig";

/**
 * Validate retrieval of a system configuration with string value type.
 *
 * This test creates a string-type configuration entry and verifies it can be
 * retrieved correctly with all properties intact.
 *
 * Test workflow:
 *
 * 1. Create a system configuration entry with config_key='deployment_environment',
 *    config_value='production', and value_type='string'
 * 2. Retrieve the configuration using the config_key
 * 3. Validate that the retrieved configuration matches the created entry
 * 4. Verify the value_type is correctly set to 'string'
 * 5. Confirm all metadata (version, timestamps) are properly set
 */
export async function test_api_system_configuration_retrieve_string_value(
  connection: api.IConnection,
) {
  // Create a system configuration entry with string type
  const configKey = "deployment_environment";
  const configValue = "production";

  const createRequest = {
    config_key: configKey,
    config_value: configValue,
    value_type: "string" as const,
    description: "Deployment environment configuration",
  } satisfies ITodoListSystemConfig.ICreate;

  const createdConfig =
    await api.functional.todoList.systemConfigurations.create(connection, {
      body: createRequest,
    });
  typia.assert(createdConfig);

  // Validate created configuration basic properties
  TestValidator.equals(
    "created config_key",
    createdConfig.config_key,
    configKey,
  );
  TestValidator.equals(
    "created config_value",
    createdConfig.config_value,
    configValue,
  );
  TestValidator.equals(
    "created value_type",
    createdConfig.value_type,
    "string",
  );
  TestValidator.predicate(
    "created config has valid ID",
    createdConfig.id !== "",
  );
  TestValidator.predicate(
    "created config version is 1",
    createdConfig.version === 1,
  );

  // Retrieve the configuration by config_key
  const retrievedConfig = await api.functional.todoList.systemConfigurations.at(
    connection,
    {
      configKey: configKey,
    },
  );
  typia.assert(retrievedConfig);

  // Validate retrieved configuration matches created configuration
  TestValidator.equals(
    "retrieved config_key",
    retrievedConfig.config_key,
    configKey,
  );
  TestValidator.equals(
    "retrieved config_value",
    retrievedConfig.config_value,
    configValue,
  );
  TestValidator.equals(
    "retrieved value_type",
    retrievedConfig.value_type,
    "string",
  );
  TestValidator.equals(
    "retrieved ID matches created ID",
    retrievedConfig.id,
    createdConfig.id,
  );
  TestValidator.equals(
    "retrieved version matches created version",
    retrievedConfig.version,
    createdConfig.version,
  );
  TestValidator.equals(
    "retrieved description matches",
    retrievedConfig.description,
    createdConfig.description,
  );

  // Validate timestamps exist and are properly formatted
  TestValidator.predicate(
    "retrieved config has created_at",
    retrievedConfig.created_at !== "",
  );
  TestValidator.predicate(
    "retrieved config has updated_at",
    retrievedConfig.updated_at !== "",
  );
  TestValidator.equals(
    "timestamps match",
    retrievedConfig.created_at,
    createdConfig.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    retrievedConfig.updated_at,
    createdConfig.updated_at,
  );
}
