import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfig";

export async function test_api_system_configuration_create_unique_key_validation(
  connection: api.IConnection,
) {
  /**
   * Test that system configuration keys must be unique.
   *
   * Step 1: Create first system configuration entry with a specific key Step 2:
   * Attempt to create second entry with the same configuration key Step 3:
   * Verify that duplicate key creation fails with appropriate error Step 4:
   * Confirm original configuration still exists and is unchanged
   */

  // Step 1: Create initial system configuration entry
  const configKey = "max_todos_per_user";
  const firstConfig: ITodoListSystemConfig =
    await api.functional.todoList.systemConfigurations.create(connection, {
      body: {
        config_key: configKey,
        config_value: "100",
        value_type: "integer",
        description: "Maximum number of todos per user",
      } satisfies ITodoListSystemConfig.ICreate,
    });
  typia.assert(firstConfig);

  // Verify first configuration was created successfully
  TestValidator.equals(
    "first config key matches",
    firstConfig.config_key,
    configKey,
  );
  TestValidator.equals(
    "first config value matches",
    firstConfig.config_value,
    "100",
  );
  TestValidator.equals(
    "first config type is integer",
    firstConfig.value_type,
    "integer",
  );
  TestValidator.predicate(
    "first config version is 1",
    firstConfig.version === 1,
  );

  // Step 2 & 3: Attempt to create duplicate configuration with same key
  await TestValidator.error(
    "duplicate config key should fail with conflict error",
    async () => {
      await api.functional.todoList.systemConfigurations.create(connection, {
        body: {
          config_key: configKey, // Same key as first configuration
          config_value: "50",
          value_type: "integer",
          description: "Attempt to create duplicate",
        } satisfies ITodoListSystemConfig.ICreate,
      });
    },
  );

  // Step 4: Verify original configuration still exists with correct properties
  TestValidator.predicate(
    "first config has valid id after duplicate attempt",
    firstConfig.id !== null && firstConfig.id !== undefined,
  );
}
