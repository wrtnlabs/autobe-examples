import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfig";

export async function test_api_system_configuration_creation_unique_constraint_validation(
  connection: api.IConnection,
) {
  /**
   * Test the unique constraint validation for system configuration entries.
   *
   * This test verifies that the system enforces the unique constraint on
   * config_key by attempting to create two configurations with identical keys.
   * The first creation should succeed, and the second should fail with a
   * conflict error.
   *
   * Process:
   *
   * 1. Generate a unique configuration key
   * 2. Create the first configuration with this key successfully
   * 3. Attempt to create a second configuration with the same key
   * 4. Verify that the second attempt fails due to unique constraint violation
   */

  // Step 1: Generate a unique configuration key
  const configKey = `test_config_${RandomGenerator.alphaNumeric(8)}`;
  const configValue = RandomGenerator.paragraph({ sentences: 2 });

  // Step 2: Create the first configuration successfully
  const firstConfig = await api.functional.todoList.systemConfigurations.create(
    connection,
    {
      body: {
        config_key: configKey,
        config_value: configValue,
        value_type: "string",
        description: "Test configuration for unique constraint validation",
      } satisfies ITodoListSystemConfig.ICreate,
    },
  );
  typia.assert(firstConfig);

  // Verify the first configuration was created successfully
  TestValidator.equals(
    "first configuration key matches",
    firstConfig.config_key,
    configKey,
  );
  TestValidator.equals(
    "first configuration value matches",
    firstConfig.config_value,
    configValue,
  );
  TestValidator.equals("initial version is 1", firstConfig.version, 1);

  // Step 3 & 4: Attempt to create a second configuration with the same key
  // This should fail due to unique constraint violation
  await TestValidator.error(
    "duplicate config_key should fail with conflict error",
    async () => {
      await api.functional.todoList.systemConfigurations.create(connection, {
        body: {
          config_key: configKey,
          config_value: "different value",
          value_type: "string",
          description: "Duplicate configuration attempt",
        } satisfies ITodoListSystemConfig.ICreate,
      });
    },
  );
}
