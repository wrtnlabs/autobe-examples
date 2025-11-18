import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfig";

/**
 * Test creation of a deployment environment configuration flag.
 *
 * This test validates the creation of a system configuration entry that
 * designates the deployment environment (e.g., 'production'). This is a
 * critical operational setting used by operations teams to control
 * environment-specific behavior throughout the application without requiring
 * code changes or database migrations.
 *
 * The test verifies:
 *
 * 1. Configuration is successfully created with deployment_environment key
 * 2. The value is correctly stored as 'production'
 * 3. Type designation is properly set as 'string'
 * 4. Auto-generated fields (id, timestamps, version) are correct
 * 5. The configuration can be used for deployment-specific behavior decisions
 */
export async function test_api_system_configuration_creation_deployment_environment_flag(
  connection: api.IConnection,
) {
  // Step 1: Create deployment environment configuration
  // This creates a system-wide configuration that operations teams use to identify the deployment environment
  const configData = {
    config_key: "deployment_environment",
    config_value: "production",
    value_type: "string" as const,
    description:
      "Designates the deployment environment for this system instance",
  } satisfies ITodoListSystemConfig.ICreate;

  const config: ITodoListSystemConfig =
    await api.functional.todoList.systemConfigurations.create(connection, {
      body: configData,
    });

  // Validate the response is properly typed and complete
  // typia.assert() validates ALL aspects: id format, datetime format, types, constraints, everything
  typia.assert(config);

  // Step 2: Verify configuration key matches what was sent
  TestValidator.equals(
    "configuration key should be deployment_environment",
    config.config_key,
    "deployment_environment",
  );

  // Step 3: Verify configuration value is correctly stored
  TestValidator.equals(
    "configuration value should be production",
    config.config_value,
    "production",
  );

  // Step 4: Verify value type designation is correct
  TestValidator.equals(
    "value type should be string",
    config.value_type,
    "string",
  );

  // Step 5: Verify initial version is 1 for new configuration
  TestValidator.equals("initial version should be 1", config.version, 1);

  // Step 6: Verify description is correctly stored
  TestValidator.equals(
    "description should match input",
    config.description,
    "Designates the deployment environment for this system instance",
  );

  // Step 7: Verify updated_at matches created_at for new entry
  TestValidator.equals(
    "updated_at should equal created_at for new configuration",
    config.updated_at,
    config.created_at,
  );

  // Step 8: Verify configuration is now available for deployment-specific behavior
  // The system can use config.config_value === "production" to make deployment-specific decisions
  TestValidator.predicate(
    "configuration value can be used for runtime environment decisions",
    config.config_value === "production",
  );
}
