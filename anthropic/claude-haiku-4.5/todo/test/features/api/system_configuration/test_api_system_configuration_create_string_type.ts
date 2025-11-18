import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfig";

/**
 * Test creating a system configuration entry with string value_type.
 *
 * Validates that system configuration entries can be created with string
 * values. The test creates a configuration entry for a deployment environment
 * setting, verifies that the entry is created successfully with auto-generated
 * UUID, initial version 1, and proper UTC timestamps.
 *
 * 1. Create system configuration with string value_type
 * 2. Validate response contains auto-generated UUID id
 * 3. Validate version is initialized to 1
 * 4. Validate timestamps are in UTC ISO 8601 format
 * 5. Validate all input values are properly stored
 */
export async function test_api_system_configuration_create_string_type(
  connection: api.IConnection,
) {
  const configKey = "deployment_environment";
  const configValue = "production";
  const description =
    "Specifies the current deployment environment (production, staging, development)";

  const created = await api.functional.todoList.systemConfigurations.create(
    connection,
    {
      body: {
        config_key: configKey,
        config_value: configValue,
        value_type: "string",
        description: description,
      } satisfies ITodoListSystemConfig.ICreate,
    },
  );

  typia.assert(created);

  // Validate id is UUID format
  TestValidator.predicate(
    "created configuration has valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      created.id,
    ),
  );

  // Validate version is initialized to 1
  TestValidator.equals(
    "version should be initialized to 1",
    created.version,
    1,
  );

  // Validate config_key matches input
  TestValidator.equals(
    "config_key should match input",
    created.config_key,
    configKey,
  );

  // Validate config_value matches input
  TestValidator.equals(
    "config_value should match input",
    created.config_value,
    configValue,
  );

  // Validate value_type matches input
  TestValidator.equals(
    "value_type should be string",
    created.value_type,
    "string",
  );

  // Validate description matches input
  TestValidator.equals(
    "description should match input",
    created.description,
    description,
  );

  // Validate created_at is ISO 8601 format
  TestValidator.predicate(
    "created_at should be in ISO 8601 UTC format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(
      created.created_at,
    ),
  );

  // Validate updated_at is ISO 8601 format
  TestValidator.predicate(
    "updated_at should be in ISO 8601 UTC format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(
      created.updated_at,
    ),
  );

  // Validate created_at and updated_at are equal for new entry
  TestValidator.equals(
    "created_at and updated_at should be equal for new entry",
    created.created_at,
    created.updated_at,
  );
}
