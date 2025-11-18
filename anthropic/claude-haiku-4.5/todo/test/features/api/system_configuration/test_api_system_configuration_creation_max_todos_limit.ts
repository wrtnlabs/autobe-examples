import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfig";

export async function test_api_system_configuration_creation_max_todos_limit(
  connection: api.IConnection,
) {
  /**
   * Test creating a system configuration for max todos per user limit.
   *
   * This test validates that the system can create and store configuration
   * entries that define operational limits and business rules. We create a
   * configuration that sets the maximum number of todos a user can have, which
   * is then enforced by the application at runtime.
   */

  // Create system configuration for max todos per user
  const configurationBody = {
    config_key: "max_todos_per_user",
    config_value: "10000",
    value_type: "integer" as const,
    description: "Maximum number of todos each user can create in the system",
  } satisfies ITodoListSystemConfig.ICreate;

  const createdConfig: ITodoListSystemConfig =
    await api.functional.todoList.systemConfigurations.create(connection, {
      body: configurationBody,
    });

  // Validate the response
  typia.assert(createdConfig);

  // Verify configuration properties
  TestValidator.equals(
    "configuration key matches",
    createdConfig.config_key,
    "max_todos_per_user",
  );

  TestValidator.equals(
    "configuration value matches",
    createdConfig.config_value,
    "10000",
  );

  TestValidator.equals(
    "value type is integer",
    createdConfig.value_type,
    "integer",
  );

  TestValidator.equals(
    "description matches",
    createdConfig.description,
    "Maximum number of todos each user can create in the system",
  );

  TestValidator.predicate("configuration has auto-generated UUID id", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      createdConfig.id,
    ),
  );

  TestValidator.equals("initial version is 1", createdConfig.version, 1);

  TestValidator.predicate(
    "created_at is valid ISO datetime",
    () => !isNaN(new Date(createdConfig.created_at).getTime()),
  );

  TestValidator.predicate(
    "updated_at is valid ISO datetime",
    () => !isNaN(new Date(createdConfig.updated_at).getTime()),
  );

  TestValidator.equals(
    "created_at and updated_at are equal on creation",
    createdConfig.created_at,
    createdConfig.updated_at,
  );
}
