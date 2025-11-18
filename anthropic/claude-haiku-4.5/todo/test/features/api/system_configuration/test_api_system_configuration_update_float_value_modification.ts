import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfig";
import type { ITodoListSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfiguration";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test updating a float-type configuration value to a different decimal value.
 *
 * This test validates the complete workflow for modifying a float-type system
 * configuration:
 *
 * 1. Register a new user to establish authentication context
 * 2. Create a float-type configuration entry with initial value '3.14'
 * 3. Update the configuration to a new float value '2.71'
 * 4. Verify the float value is updated correctly
 * 5. Confirm the version number increments from 1 to 2
 * 6. Ensure the value_type remains 'float' throughout the update
 * 7. Validate the updated_at timestamp reflects the modification
 */
export async function test_api_system_configuration_update_float_value_modification(
  connection: api.IConnection,
) {
  // Step 1: Register a new user for authentication
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userPassword: string = "testPassword123";

  const userRegistration: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000/",
        ip: "127.0.0.1",
        user_agent: "Test Client",
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(userRegistration);

  // Step 2: Create a float-type configuration with initial value '3.14'
  const configKey: string = RandomGenerator.alphaNumeric(8);
  const initialFloatValue: string = "3.14";

  const createdConfig: ITodoListSystemConfig =
    await api.functional.todoList.systemConfigurations.create(connection, {
      body: {
        config_key: configKey,
        config_value: initialFloatValue,
        value_type: "float",
        description: "Test float configuration for value modification",
      } satisfies ITodoListSystemConfig.ICreate,
    });
  typia.assert(createdConfig);

  // Validate initial configuration state
  TestValidator.equals(
    "initial config key matches",
    createdConfig.config_key,
    configKey,
  );
  TestValidator.equals(
    "initial config value is 3.14",
    createdConfig.config_value,
    initialFloatValue,
  );
  TestValidator.equals(
    "initial value_type is float",
    createdConfig.value_type,
    "float",
  );
  TestValidator.equals("initial version is 1", createdConfig.version, 1);

  // Step 3: Update the configuration to new float value '2.71'
  const updatedFloatValue: string = "2.71";

  const updatedConfig: ITodoListSystemConfiguration =
    await api.functional.todoList.user.systemConfigurations.update(connection, {
      configKey: configKey,
      body: {
        config_value: updatedFloatValue,
        description: "Updated float configuration value",
      } satisfies ITodoListSystemConfiguration.IUpdate,
    });
  typia.assert(updatedConfig);

  // Step 4: Verify the float value has been updated
  TestValidator.equals(
    "updated config value is 2.71",
    updatedConfig.config_value,
    updatedFloatValue,
  );

  // Step 5: Confirm version number has incremented
  TestValidator.equals("version incremented to 2", updatedConfig.version, 2);

  // Step 6: Ensure value_type remains 'float'
  TestValidator.equals(
    "value_type remains float",
    updatedConfig.value_type,
    "float",
  );

  // Step 7: Validate the configuration key is unchanged
  TestValidator.equals(
    "config key remains unchanged",
    updatedConfig.config_key,
    configKey,
  );

  // Step 8: Verify description was updated
  TestValidator.equals(
    "description was updated",
    updatedConfig.description,
    "Updated float configuration value",
  );

  // Step 9: Validate timestamps are in proper order
  TestValidator.predicate("created_at is before updated_at", () => {
    const createdTime = new Date(createdConfig.created_at).getTime();
    const updatedTime = new Date(updatedConfig.updated_at).getTime();
    return createdTime <= updatedTime;
  });
}
