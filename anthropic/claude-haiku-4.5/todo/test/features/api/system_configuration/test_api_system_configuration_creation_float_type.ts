import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfig";

/**
 * Test creating a system configuration entry with a float value type.
 *
 * Validates that the system stores configuration entries with decimal values
 * and properly designates them as 'float' type. The test creates a
 * configuration with a float value like '3.14', verifies the creation was
 * successful, and confirms all required metadata fields are automatically
 * populated by the system.
 *
 * Steps:
 *
 * 1. Generate test data for float configuration including a decimal value
 * 2. Create a system configuration with value_type 'float'
 * 3. Validate the response contains the created configuration
 * 4. Verify the configuration has all required fields:
 *
 *    - Unique UUID id
 *    - Correct config_key
 *    - Config value as string
 *    - Value_type = 'float'
 *    - Version number = 1 (new configuration)
 *    - ISO 8601 timestamps for created_at and updated_at
 *    - Optional description if provided
 */
export async function test_api_system_configuration_creation_float_type(
  connection: api.IConnection,
) {
  // Step 1: Prepare test data for a float configuration
  const config_key = `max_timeout_${RandomGenerator.alphaNumeric(8)}`;
  const config_value = "3.14";
  const description = "Maximum timeout value in seconds";

  // Step 2: Create system configuration with float type
  const created_config: ITodoListSystemConfig =
    await api.functional.todoList.systemConfigurations.create(connection, {
      body: {
        config_key,
        config_value,
        value_type: "float",
        description,
      } satisfies ITodoListSystemConfig.ICreate,
    });

  // Step 3: Validate the response
  typia.assert(created_config);

  // Step 4: Verify all required fields are present and correct
  TestValidator.equals(
    "config_key matches",
    created_config.config_key,
    config_key,
  );
  TestValidator.equals(
    "config_value matches",
    created_config.config_value,
    config_value,
  );
  TestValidator.equals(
    "value_type is float",
    created_config.value_type,
    "float",
  );
  TestValidator.equals(
    "description matches",
    created_config.description,
    description,
  );

  // Verify auto-generated fields
  TestValidator.predicate(
    "id is valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      created_config.id,
    ),
  );
  TestValidator.equals(
    "version is 1 for new configuration",
    created_config.version,
    1,
  );

  // Verify timestamps are valid ISO 8601 format
  TestValidator.predicate(
    "created_at is valid ISO 8601 timestamp",
    !isNaN(Date.parse(created_config.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO 8601 timestamp",
    !isNaN(Date.parse(created_config.updated_at)),
  );

  // Verify timestamps are equal for newly created configuration
  TestValidator.equals(
    "created_at equals updated_at on creation",
    created_config.created_at,
    created_config.updated_at,
  );
}
