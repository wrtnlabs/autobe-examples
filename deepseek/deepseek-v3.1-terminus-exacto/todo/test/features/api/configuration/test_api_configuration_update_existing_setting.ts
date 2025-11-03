import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppConfiguration";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test updating an existing configuration setting with valid data. This
 * scenario validates that system administrators can modify configuration
 * values, change data types, update descriptions, and alter status for existing
 * configuration keys. The test ensures that the system properly validates the
 * configuration key exists before applying updates and that the new
 * configuration value matches the specified data type requirements.
 * Configuration updates should be tracked with timestamp changes for audit
 * purposes.
 */
export async function test_api_configuration_update_existing_setting(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as user for configuration creation
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "password123",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create a configuration setting to be updated
  const initialConfig = await api.functional.todoApp.configurations.create(
    connection,
    {
      body: {
        config_key: `config_${RandomGenerator.alphaNumeric(8)}`,
        config_value: "initial_value",
        data_type: "string",
        description: "Initial configuration setting for testing updates",
        status: "active",
      } satisfies ITodoAppConfiguration.ICreate,
    },
  );
  typia.assert(initialConfig);

  // Step 3: Update the configuration setting with new values
  const updatedConfig = await api.functional.todoApp.configurations.update(
    connection,
    {
      configKey: initialConfig.config_key,
      body: {
        config_value: "updated_value",
        description: "Updated configuration description",
        status: "disabled",
      } satisfies ITodoAppConfiguration.IUpdate,
    },
  );
  typia.assert(updatedConfig);

  // Step 4: Validate that the configuration was properly updated
  TestValidator.equals(
    "config key should remain the same",
    updatedConfig.config_key,
    initialConfig.config_key,
  );
  TestValidator.equals(
    "config value should be updated",
    updatedConfig.config_value,
    "updated_value",
  );
  TestValidator.equals(
    "data type should remain unchanged",
    updatedConfig.data_type,
    "string",
  );
  TestValidator.equals(
    "description should be updated",
    updatedConfig.description,
    "Updated configuration description",
  );
  TestValidator.equals(
    "status should be updated",
    updatedConfig.status,
    "disabled",
  );
  TestValidator.notEquals(
    "updated_at timestamp should change",
    updatedConfig.updated_at,
    initialConfig.updated_at,
  );

  // Step 5: Test updating with different data type
  const updatedWithNewType = await api.functional.todoApp.configurations.update(
    connection,
    {
      configKey: initialConfig.config_key,
      body: {
        config_value: "true",
        data_type: "boolean",
      } satisfies ITodoAppConfiguration.IUpdate,
    },
  );
  typia.assert(updatedWithNewType);

  TestValidator.equals(
    "data type should be updated to boolean",
    updatedWithNewType.data_type,
    "boolean",
  );
  TestValidator.equals(
    "config value should match boolean type",
    updatedWithNewType.config_value,
    "true",
  );

  // Step 6: Test updating configuration key itself
  const newConfigKey = `config_${RandomGenerator.alphaNumeric(8)}`;
  const updatedWithNewKey = await api.functional.todoApp.configurations.update(
    connection,
    {
      configKey: initialConfig.config_key,
      body: {
        config_key: newConfigKey,
      } satisfies ITodoAppConfiguration.IUpdate,
    },
  );
  typia.assert(updatedWithNewKey);

  TestValidator.equals(
    "config key should be updated",
    updatedWithNewKey.config_key,
    newConfigKey,
  );
}
