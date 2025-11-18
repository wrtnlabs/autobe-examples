import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfig";
import type { ITodoListSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfiguration";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test updating an integer-type system configuration value.
 *
 * This test validates the complete workflow of modifying a system configuration
 * entry that stores an integer-type value. The test authenticates a user,
 * creates an integer configuration with an initial numeric value, then updates
 * that configuration to a different integer value. The test verifies that the
 * numeric value is properly updated in storage, the version number increments
 * to reflect the change, and the value_type designation remains correctly set
 * to 'integer' after the update operation.
 *
 * Steps:
 *
 * 1. Register and authenticate a user account
 * 2. Create a system configuration entry with integer type and initial value
 * 3. Update the configuration with a new integer value
 * 4. Verify the updated value matches the new numeric value
 * 5. Verify the version incremented from 1 to 2
 * 6. Verify the value_type remains 'integer'
 */
export async function test_api_system_configuration_update_integer_value_modification(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: RandomGenerator.alphabets(12),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create a system configuration with integer type
  const configKey = `max_todos_${RandomGenerator.alphaNumeric(8)}`;
  const initialValue = "10000";
  const createdConfig =
    await api.functional.todoList.systemConfigurations.create(connection, {
      body: {
        config_key: configKey,
        config_value: initialValue,
        value_type: "integer",
        description: "Maximum todos per user - testing integer configuration",
      } satisfies ITodoListSystemConfig.ICreate,
    });
  typia.assert(createdConfig);
  TestValidator.equals(
    "created config key matches",
    createdConfig.config_key,
    configKey,
  );
  TestValidator.equals(
    "created config value matches initial",
    createdConfig.config_value,
    initialValue,
  );
  TestValidator.equals(
    "created config type is integer",
    createdConfig.value_type,
    "integer",
  );
  TestValidator.equals("created config version is 1", createdConfig.version, 1);

  // Step 3: Update the configuration with a new integer value
  const newValue = "20000";
  const updatedConfig =
    await api.functional.todoList.user.systemConfigurations.update(connection, {
      configKey: configKey,
      body: {
        config_value: newValue,
        description: "Updated maximum todos per user - increased limit",
      } satisfies ITodoListSystemConfiguration.IUpdate,
    });
  typia.assert(updatedConfig);

  // Step 4: Verify the updated value matches the new numeric value
  TestValidator.equals(
    "updated config value matches new value",
    updatedConfig.config_value,
    newValue,
  );

  // Step 5: Verify the version incremented
  TestValidator.equals("version incremented to 2", updatedConfig.version, 2);

  // Step 6: Verify the value_type remains 'integer'
  TestValidator.equals(
    "value_type remains integer after update",
    updatedConfig.value_type,
    "integer",
  );

  // Additional verification: config key should remain unchanged
  TestValidator.equals(
    "config key unchanged after update",
    updatedConfig.config_key,
    configKey,
  );
}
