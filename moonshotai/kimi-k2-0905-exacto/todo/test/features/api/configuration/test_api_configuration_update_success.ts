import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoConfiguration";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Test successful configuration update operation by an authenticated user.
 *
 * This comprehensive test validates the complete configuration management
 * lifecycle:
 *
 * 1. User registration to obtain authentication credentials
 * 2. Initial configuration creation with random test data
 * 3. Configuration update operation with new values
 * 4. Validation that the update was successful and data is correct
 *
 * The test ensures that authenticated users can modify system configuration
 * settings and that the API properly handles configuration updates with
 * validation.
 */
export async function test_api_configuration_update_success(
  connection: api.IConnection,
) {
  // Step 1: Register a new user to obtain authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: ITodoUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: "securePassword123",
      } satisfies ITodoUser.IJoin,
    },
  );
  typia.assert(user);

  // Verify user was created successfully
  TestValidator.predicate("user has valid ID", () => user.id.length > 0);
  TestValidator.predicate(
    "user email matches input",
    () => user.email === userEmail,
  );
  TestValidator.predicate("user has token", () => user.token.access.length > 0);

  // Step 2: Create initial configuration setting
  const configKey = `test_config_${RandomGenerator.alphabets(10)}`;
  const initialValue = "initial_test_value";
  const configType = "string";

  const createdConfig: ITodoConfiguration =
    await api.functional.todo.configurations.create(connection, {
      body: {
        key: configKey,
        value: initialValue,
        description: "Test configuration for update validation",
        type: configType,
        is_system: false,
      } satisfies ITodoConfiguration.ICreate,
    });
  typia.assert(createdConfig);

  // Verify configuration was created correctly
  TestValidator.equals(
    "config key matches created key",
    createdConfig.key,
    configKey,
  );
  TestValidator.equals(
    "config value matches initial value",
    createdConfig.value,
    initialValue,
  );
  TestValidator.equals(
    "config type matches string type",
    createdConfig.type,
    configType,
  );
  TestValidator.equals(
    "config is not system config",
    createdConfig.is_system,
    false,
  );
  TestValidator.predicate(
    "config has valid ID",
    () => createdConfig.id.length > 0,
  );
  TestValidator.predicate(
    "config has valid timestamps",
    () =>
      createdConfig.created_at.length > 0 &&
      createdConfig.updated_at.length > 0,
  );

  // Step 3: Update the configuration with new values
  const updatedValue = "updated_test_value";
  const updatedDescription = "Updated test configuration description";

  const updatedConfig: ITodoConfiguration =
    await api.functional.todo.user.configurations.update(connection, {
      key: configKey,
      body: {
        value: updatedValue,
        description: updatedDescription,
        type: configType,
        is_system: false,
      } satisfies ITodoConfiguration.IUpdate,
    });
  typia.assert(updatedConfig);

  // Step 4: Validate the update was successful
  TestValidator.equals(
    "config key remains unchanged",
    updatedConfig.key,
    configKey,
  );
  TestValidator.equals(
    "config value has been updated",
    updatedConfig.value,
    updatedValue,
  );
  TestValidator.equals(
    "config description has been updated",
    updatedConfig.description,
    updatedDescription,
  );
  TestValidator.equals(
    "config type remains unchanged",
    updatedConfig.type,
    configType,
  );
  TestValidator.equals(
    "config system flag remains unchanged",
    updatedConfig.is_system,
    false,
  );
  TestValidator.equals(
    "config ID remains unchanged",
    updatedConfig.id,
    createdConfig.id,
  );

  // Verify timestamps were updated appropriately
  TestValidator.predicate(
    "updated_at timestamp was modified",
    () => updatedConfig.updated_at !== createdConfig.updated_at,
  );
  TestValidator.equals(
    "created_at timestamp remains unchanged",
    updatedConfig.created_at,
    createdConfig.created_at,
  );

  // Verify the updated value is different from initial
  TestValidator.notEquals(
    "value changed from initial value",
    updatedConfig.value,
    initialValue,
  );
  TestValidator.notEquals(
    "description changed from initial description",
    updatedConfig.description,
    createdConfig.description,
  );
}
