import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfig";
import type { ITodoListSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfiguration";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test updating a boolean-type system configuration value.
 *
 * Creates a feature flag configuration with value 'false', then updates it to
 * 'true'. Verifies the boolean value is updated correctly, version increments,
 * and value_type remains 'boolean'.
 *
 * Steps:
 *
 * 1. Authenticate user to establish session
 * 2. Create boolean-type feature flag configuration with value 'false'
 * 3. Update the configuration value to 'true'
 * 4. Verify the updated value matches 'true'
 * 5. Confirm version incremented from 1 to 2
 * 6. Ensure value_type remains 'boolean'
 */
export async function test_api_system_configuration_update_boolean_value_modification(
  connection: api.IConnection,
) {
  // Step 1: Authenticate user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "Test@Password123",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create boolean-type feature flag configuration with value 'false'
  const configKey = `feature_flag_${RandomGenerator.alphaNumeric(8)}`;
  const createdConfig =
    await api.functional.todoList.systemConfigurations.create(connection, {
      body: {
        config_key: configKey,
        config_value: "false",
        value_type: "boolean",
        description: "Test boolean feature flag configuration",
      } satisfies ITodoListSystemConfig.ICreate,
    });
  typia.assert(createdConfig);

  // Verify initial state
  TestValidator.equals(
    "initial config value is false",
    createdConfig.config_value,
    "false",
  );
  TestValidator.equals(
    "initial value_type is boolean",
    createdConfig.value_type,
    "boolean",
  );
  TestValidator.equals("initial version is 1", createdConfig.version, 1);

  // Step 3: Update the configuration value to 'true'
  const updatedConfig =
    await api.functional.todoList.user.systemConfigurations.update(connection, {
      configKey: configKey,
      body: {
        config_value: "true",
        description: "Updated boolean feature flag configuration",
      } satisfies ITodoListSystemConfiguration.IUpdate,
    });
  typia.assert(updatedConfig);

  // Step 4: Verify the updated value matches 'true'
  TestValidator.equals(
    "updated config value is true",
    updatedConfig.config_value,
    "true",
  );

  // Step 5: Confirm version incremented from 1 to 2
  TestValidator.equals("version incremented to 2", updatedConfig.version, 2);

  // Step 6: Ensure value_type remains 'boolean'
  TestValidator.equals(
    "value_type remains boolean",
    updatedConfig.value_type,
    "boolean",
  );

  // Additional validation: verify description was updated
  TestValidator.equals(
    "description updated correctly",
    updatedConfig.description,
    "Updated boolean feature flag configuration",
  );
}
