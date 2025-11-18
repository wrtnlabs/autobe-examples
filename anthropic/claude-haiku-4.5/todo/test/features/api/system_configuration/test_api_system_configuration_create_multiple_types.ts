import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfig";

/**
 * Test creating multiple system configuration entries of different types.
 *
 * This test validates the creation of system configuration entries with various
 * value types (string, integer, boolean, float) in sequence. Each configuration
 * is created with a unique key, appropriate typed value, and optional
 * description. The test verifies that:
 *
 * 1. String type configurations are created successfully
 * 2. Integer type configurations are created successfully
 * 3. Boolean type configurations are created successfully
 * 4. Float type configurations are created successfully
 * 5. All created entries maintain their type designations
 * 6. Response data contains correct structure with version and timestamps
 */
export async function test_api_system_configuration_create_multiple_types(
  connection: api.IConnection,
) {
  // Create string type configuration
  const stringConfig =
    await api.functional.todoList.systemConfigurations.create(connection, {
      body: {
        config_key: "deployment_environment",
        config_value: "production",
        value_type: "string",
        description: "Current deployment environment setting",
      } satisfies ITodoListSystemConfig.ICreate,
    });
  typia.assert(stringConfig);
  TestValidator.equals(
    "string config type is string",
    stringConfig.value_type,
    "string",
  );
  TestValidator.equals(
    "string config key matches",
    stringConfig.config_key,
    "deployment_environment",
  );
  TestValidator.equals(
    "string config value matches",
    stringConfig.config_value,
    "production",
  );
  TestValidator.predicate(
    "string config has initial version",
    stringConfig.version === 1,
  );

  // Create integer type configuration
  const integerConfig =
    await api.functional.todoList.systemConfigurations.create(connection, {
      body: {
        config_key: "max_todos_per_user",
        config_value: "1000",
        value_type: "integer",
        description: "Maximum number of todos allowed per user",
      } satisfies ITodoListSystemConfig.ICreate,
    });
  typia.assert(integerConfig);
  TestValidator.equals(
    "integer config type is integer",
    integerConfig.value_type,
    "integer",
  );
  TestValidator.equals(
    "integer config key matches",
    integerConfig.config_key,
    "max_todos_per_user",
  );
  TestValidator.equals(
    "integer config value matches",
    integerConfig.config_value,
    "1000",
  );
  TestValidator.predicate(
    "integer config has initial version",
    integerConfig.version === 1,
  );

  // Create boolean type configuration
  const booleanConfig =
    await api.functional.todoList.systemConfigurations.create(connection, {
      body: {
        config_key: "enable_feature_notifications",
        config_value: "true",
        value_type: "boolean",
        description: "Feature flag for email notifications",
      } satisfies ITodoListSystemConfig.ICreate,
    });
  typia.assert(booleanConfig);
  TestValidator.equals(
    "boolean config type is boolean",
    booleanConfig.value_type,
    "boolean",
  );
  TestValidator.equals(
    "boolean config key matches",
    booleanConfig.config_key,
    "enable_feature_notifications",
  );
  TestValidator.equals(
    "boolean config value matches",
    booleanConfig.config_value,
    "true",
  );
  TestValidator.predicate(
    "boolean config has initial version",
    booleanConfig.version === 1,
  );

  // Create float type configuration
  const floatConfig = await api.functional.todoList.systemConfigurations.create(
    connection,
    {
      body: {
        config_key: "api_rate_limit_multiplier",
        config_value: "1.5",
        value_type: "float",
        description: "Rate limiting multiplier for API requests",
      } satisfies ITodoListSystemConfig.ICreate,
    },
  );
  typia.assert(floatConfig);
  TestValidator.equals(
    "float config type is float",
    floatConfig.value_type,
    "float",
  );
  TestValidator.equals(
    "float config key matches",
    floatConfig.config_key,
    "api_rate_limit_multiplier",
  );
  TestValidator.equals(
    "float config value matches",
    floatConfig.config_value,
    "1.5",
  );
  TestValidator.predicate(
    "float config has initial version",
    floatConfig.version === 1,
  );

  // Validate that all configurations have proper timestamps
  TestValidator.predicate(
    "string config has created_at timestamp",
    stringConfig.created_at !== null &&
      stringConfig.created_at !== undefined &&
      stringConfig.created_at.length > 0,
  );
  TestValidator.predicate(
    "string config has updated_at timestamp",
    stringConfig.updated_at !== null &&
      stringConfig.updated_at !== undefined &&
      stringConfig.updated_at.length > 0,
  );

  TestValidator.predicate(
    "integer config has created_at timestamp",
    integerConfig.created_at !== null &&
      integerConfig.created_at !== undefined &&
      integerConfig.created_at.length > 0,
  );
  TestValidator.predicate(
    "integer config has updated_at timestamp",
    integerConfig.updated_at !== null &&
      integerConfig.updated_at !== undefined &&
      integerConfig.updated_at.length > 0,
  );

  TestValidator.predicate(
    "boolean config has created_at timestamp",
    booleanConfig.created_at !== null &&
      booleanConfig.created_at !== undefined &&
      booleanConfig.created_at.length > 0,
  );
  TestValidator.predicate(
    "boolean config has updated_at timestamp",
    booleanConfig.updated_at !== null &&
      booleanConfig.updated_at !== undefined &&
      booleanConfig.updated_at.length > 0,
  );

  TestValidator.predicate(
    "float config has created_at timestamp",
    floatConfig.created_at !== null &&
      floatConfig.created_at !== undefined &&
      floatConfig.created_at.length > 0,
  );
  TestValidator.predicate(
    "float config has updated_at timestamp",
    floatConfig.updated_at !== null &&
      floatConfig.updated_at !== undefined &&
      floatConfig.updated_at.length > 0,
  );

  // Validate all configs have unique IDs
  TestValidator.notEquals(
    "string and integer configs have different IDs",
    stringConfig.id,
    integerConfig.id,
  );
  TestValidator.notEquals(
    "integer and boolean configs have different IDs",
    integerConfig.id,
    booleanConfig.id,
  );
  TestValidator.notEquals(
    "boolean and float configs have different IDs",
    booleanConfig.id,
    floatConfig.id,
  );
}
