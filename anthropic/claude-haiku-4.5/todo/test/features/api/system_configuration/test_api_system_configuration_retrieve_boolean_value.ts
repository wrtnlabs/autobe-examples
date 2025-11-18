import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfig";

/**
 * Test retrieving a system configuration with boolean value_type.
 *
 * This test validates the complete workflow of creating and retrieving a
 * boolean-type system configuration entry. The test creates a configuration
 * entry with a boolean value type designation, then retrieves it to ensure the
 * value and type information are correctly preserved and returned.
 *
 * Workflow:
 *
 * 1. Create a system configuration entry with boolean value_type
 * 2. Retrieve the configuration by its key
 * 3. Validate that the retrieved configuration matches the created configuration
 * 4. Verify that the value_type is correctly designated as 'boolean'
 */
export async function test_api_system_configuration_retrieve_boolean_value(
  connection: api.IConnection,
) {
  // Step 1: Create a boolean-type system configuration entry
  const configKey = "enable_feature_flag_xyz";
  const configValue = "true";

  const created = await api.functional.todoList.systemConfigurations.create(
    connection,
    {
      body: {
        config_key: configKey,
        config_value: configValue,
        value_type: "boolean",
        description: "Feature flag to enable experimental functionality",
      } satisfies ITodoListSystemConfig.ICreate,
    },
  );
  typia.assert(created);

  // Validate created configuration
  TestValidator.equals(
    "created config_key matches",
    created.config_key,
    configKey,
  );
  TestValidator.equals(
    "created config_value matches",
    created.config_value,
    configValue,
  );
  TestValidator.equals(
    "created value_type is boolean",
    created.value_type,
    "boolean",
  );
  TestValidator.predicate("created has version 1", created.version === 1);
  TestValidator.predicate(
    "created has creation timestamp",
    created.created_at !== null && created.created_at !== undefined,
  );
  TestValidator.predicate(
    "created has update timestamp",
    created.updated_at !== null && created.updated_at !== undefined,
  );

  // Step 2: Retrieve the configuration by its key
  const retrieved = await api.functional.todoList.systemConfigurations.at(
    connection,
    {
      configKey: configKey,
    },
  );
  typia.assert(retrieved);

  // Step 3: Validate that retrieved configuration matches the created one
  TestValidator.equals(
    "retrieved config_key matches",
    retrieved.config_key,
    created.config_key,
  );
  TestValidator.equals(
    "retrieved config_value matches",
    retrieved.config_value,
    created.config_value,
  );
  TestValidator.equals(
    "retrieved value_type matches",
    retrieved.value_type,
    created.value_type,
  );
  TestValidator.equals(
    "retrieved version matches",
    retrieved.version,
    created.version,
  );
  TestValidator.equals("retrieved id matches", retrieved.id, created.id);

  // Step 4: Verify the value_type is correctly designated as 'boolean'
  TestValidator.predicate(
    "value_type is boolean designation",
    retrieved.value_type === "boolean",
  );
  TestValidator.equals(
    "boolean value string representation",
    retrieved.config_value,
    "true",
  );
}
