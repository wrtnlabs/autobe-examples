import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfig";

/**
 * Test creating a system configuration entry without providing an optional
 * description field.
 *
 * Verifies that the system successfully creates a system configuration entry
 * when the description field is omitted from the request body. The test
 * validates that the API properly handles optional fields and that the creation
 * endpoint functions correctly without requiring all fields to be provided.
 *
 * Steps:
 *
 * 1. Generate required configuration data (config_key, config_value, value_type)
 * 2. Create a request body without the optional description field
 * 3. Call the API to create the system configuration
 * 4. Validate the response contains all required fields with correct types
 * 5. Verify the configuration entry was created successfully with proper version
 *    and timestamps
 */
export async function test_api_system_configuration_creation_without_optional_description(
  connection: api.IConnection,
) {
  // Generate test data for required fields
  const configKey = `test_config_${RandomGenerator.alphaNumeric(8)}`;
  const configValue = `value_${RandomGenerator.alphaNumeric(6)}`;
  const valueType = RandomGenerator.pick([
    "string",
    "integer",
    "boolean",
    "float",
  ] as const);

  // Create request body without optional description field
  const createRequest = {
    config_key: configKey,
    config_value: configValue,
    value_type: valueType,
  } satisfies ITodoListSystemConfig.ICreate;

  // Call the API to create the system configuration
  const createdConfig =
    await api.functional.todoList.systemConfigurations.create(connection, {
      body: createRequest,
    });

  // Validate the response
  typia.assert(createdConfig);

  // Verify required fields are present and have correct types
  TestValidator.equals(
    "config key matches",
    createdConfig.config_key,
    configKey,
  );
  TestValidator.equals(
    "config value matches",
    createdConfig.config_value,
    configValue,
  );
  TestValidator.equals(
    "value type matches",
    createdConfig.value_type,
    valueType,
  );

  // Verify auto-generated fields
  TestValidator.predicate(
    "id is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      createdConfig.id,
    ),
  );
  TestValidator.predicate("version is 1", createdConfig.version === 1);
  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(new Date(createdConfig.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid date",
    !isNaN(new Date(createdConfig.updated_at).getTime()),
  );

  // Verify description field is optional and may be null/undefined
  TestValidator.predicate(
    "description is null or undefined when not provided",
    createdConfig.description === null ||
      createdConfig.description === undefined,
  );
}
