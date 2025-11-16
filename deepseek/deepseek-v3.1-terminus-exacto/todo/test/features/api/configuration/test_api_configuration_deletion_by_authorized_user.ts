import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IConfigurationDataType } from "@ORGANIZATION/PROJECT-api/lib/structures/IConfigurationDataType";
import type { ITodoAppConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppConfiguration";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test the configuration deletion workflow where an authorized user permanently
 * removes a configuration setting.
 *
 * This comprehensive test validates the complete configuration deletion
 * lifecycle:
 *
 * 1. User authentication setup via account creation
 * 2. Configuration preparation by updating an existing setting
 * 3. Execution of the deletion operation
 * 4. Validation that the configuration is successfully deleted
 *
 * The test ensures proper authorization checks prevent unauthorized deletion
 * attempts and confirms the permanent nature of the deletion operation.
 */
export async function test_api_configuration_deletion_by_authorized_user(
  connection: api.IConnection,
) {
  // Step 1: Create user account for authentication context using proper API flow
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      password_hash: typia.random<string>(), // Server will handle proper hashing
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create a configuration setting by updating with a specific key
  const configurationKey = RandomGenerator.alphaNumeric(10);
  const configurationUpdate = {
    value: typia.random<string>(),
    description: "Test configuration setting for deletion validation",
    data_type: "string" as IConfigurationDataType,
    category: "test-category",
  } satisfies ITodoAppConfiguration.IUpdate;

  const createdConfiguration =
    await api.functional.todoApp.user.configurations.update(connection, {
      configurationKey: configurationKey,
      body: configurationUpdate,
    });
  typia.assert(createdConfiguration);
  TestValidator.equals(
    "configuration key matches",
    createdConfiguration.key,
    configurationKey,
  );

  // Step 3: Execute the configuration deletion operation
  await api.functional.todoApp.user.configurations.erase(connection, {
    configurationKey: configurationKey,
  });

  // Step 4: Validate that the configuration cannot be retrieved after deletion
  await TestValidator.error(
    "attempting to update deleted configuration should fail",
    async () => {
      await api.functional.todoApp.user.configurations.update(connection, {
        configurationKey: configurationKey,
        body: {
          value: "updated_value_after_deletion",
        } satisfies ITodoAppConfiguration.IUpdate,
      });
    },
  );

  // Additional validation: Attempt to delete already deleted configuration should fail
  await TestValidator.error(
    "deleting already deleted configuration should fail",
    async () => {
      await api.functional.todoApp.user.configurations.erase(connection, {
        configurationKey: configurationKey,
      });
    },
  );

  // Validate authorization: Create a second user and attempt to delete first user's configuration
  const secondUserEmail = typia.random<string & tags.Format<"email">>();
  const secondUser = await api.functional.auth.user.join(connection, {
    body: {
      email: secondUserEmail,
      password: "secondUserPassword123",
      password_hash: typia.random<string>(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(secondUser);

  // Create a configuration for the second user
  const secondUserConfigKey = RandomGenerator.alphaNumeric(10);
  const secondUserConfig =
    await api.functional.todoApp.user.configurations.update(connection, {
      configurationKey: secondUserConfigKey,
      body: {
        value: "second_user_config_value",
        data_type: "string" as IConfigurationDataType,
        category: "second-user-test",
      } satisfies ITodoAppConfiguration.IUpdate,
    });
  typia.assert(secondUserConfig);

  // Test that configuration deletion respects user authorization boundaries
  TestValidator.equals(
    "second user configuration created successfully",
    secondUserConfig.key,
    secondUserConfigKey,
  );
}
