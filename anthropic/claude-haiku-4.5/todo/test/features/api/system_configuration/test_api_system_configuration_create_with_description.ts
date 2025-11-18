import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfig";

export async function test_api_system_configuration_create_with_description(
  connection: api.IConnection,
) {
  // Test creating a system configuration with all fields including description
  const config_key = "max_todos_per_user";
  const config_value = "1000";
  const value_type: "string" | "integer" | "boolean" | "float" = "integer";
  const description = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 5,
    wordMax: 10,
  });

  // Create the configuration entry with description
  const created_config =
    await api.functional.todoList.systemConfigurations.create(connection, {
      body: {
        config_key: config_key,
        config_value: config_value,
        value_type: value_type,
        description: description,
      } satisfies ITodoListSystemConfig.ICreate,
    });

  // Validate the response
  typia.assert(created_config);

  // Verify all fields were created correctly
  TestValidator.equals(
    "config key matches",
    created_config.config_key,
    config_key,
  );
  TestValidator.equals(
    "config value matches",
    created_config.config_value,
    config_value,
  );
  TestValidator.equals(
    "value type matches",
    created_config.value_type,
    value_type,
  );
  TestValidator.equals(
    "description matches",
    created_config.description,
    description,
  );

  // Verify system-generated fields
  TestValidator.predicate("initial version is 1", created_config.version === 1);
}
