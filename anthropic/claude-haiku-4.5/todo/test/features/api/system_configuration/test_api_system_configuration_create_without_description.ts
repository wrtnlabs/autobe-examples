import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfig";

export async function test_api_system_configuration_create_without_description(
  connection: api.IConnection,
) {
  // Step 1: Create a minimal system configuration with only required fields
  const config = {
    config_key: "max_todos_per_user",
    config_value: "1000",
    value_type: "integer" as const,
  } satisfies ITodoListSystemConfig.ICreate;

  // Step 2: Call the API to create the system configuration without description
  const result: ITodoListSystemConfig =
    await api.functional.todoList.systemConfigurations.create(connection, {
      body: config,
    });

  // Step 3: Validate that the response contains all required fields with proper types and formats
  typia.assert(result);

  // Step 4: Verify the created configuration has expected property values
  TestValidator.equals(
    "config_key matches input",
    result.config_key,
    "max_todos_per_user",
  );
  TestValidator.equals(
    "config_value matches input",
    result.config_value,
    "1000",
  );
  TestValidator.equals(
    "value_type matches input",
    result.value_type,
    "integer",
  );

  // Step 5: Verify that description field is null when not provided (optional field)
  TestValidator.equals(
    "description should be null when not provided",
    result.description,
    null,
  );

  // Step 6: Verify auto-generated version starts at 1 for new configurations
  TestValidator.equals("version should start at 1", result.version, 1);

  // Step 7: Verify timestamps are equal for newly created entry
  TestValidator.equals(
    "created_at and updated_at should be equal for new entry",
    result.created_at,
    result.updated_at,
  );
}
