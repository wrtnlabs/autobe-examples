import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfig";

/**
 * Test creating a token timeout configuration for session management.
 *
 * This test validates the creation of a security-critical
 * 'token_expiration_minutes' configuration with a value of 900 (15 minutes).
 * The test verifies that:
 *
 * 1. Configuration is successfully created via POST /todoList/systemConfigurations
 * 2. The response contains all required fields with correct types
 * 3. Configuration key is stored as 'token_expiration_minutes'
 * 4. Configuration value is stored as '900' (string representation)
 * 5. Value type is designated as 'integer'
 * 6. Created entry has UUID id and version 1
 * 7. Timestamps are in ISO 8601 format
 */
export async function test_api_system_configuration_creation_token_expiration(
  connection: api.IConnection,
) {
  // Step 1: Create token expiration configuration
  const config: ITodoListSystemConfig =
    await api.functional.todoList.systemConfigurations.create(connection, {
      body: {
        config_key: "token_expiration_minutes",
        config_value: "900",
        value_type: "integer",
        description:
          "Session token expiration time in minutes for security management",
      } satisfies ITodoListSystemConfig.ICreate,
    });

  // Step 2: Validate response with complete type assertion
  typia.assert(config);

  // Step 3: Verify configuration key matches
  TestValidator.equals(
    "configuration key should be token_expiration_minutes",
    config.config_key,
    "token_expiration_minutes",
  );

  // Step 4: Verify configuration value is stored as string
  TestValidator.equals(
    "configuration value should be 900",
    config.config_value,
    "900",
  );

  // Step 5: Verify value type is integer
  TestValidator.equals(
    "value type should be integer",
    config.value_type,
    "integer",
  );

  // Step 6: Verify initial version is 1
  TestValidator.equals("version should start at 1", config.version, 1);

  // Step 7: Verify description is stored
  TestValidator.equals(
    "description should match input",
    config.description,
    "Session token expiration time in minutes for security management",
  );

  // Step 8: Verify timestamps match (initial creation)
  TestValidator.equals(
    "created_at and updated_at should match for new configuration",
    config.created_at,
    config.updated_at,
  );
}
