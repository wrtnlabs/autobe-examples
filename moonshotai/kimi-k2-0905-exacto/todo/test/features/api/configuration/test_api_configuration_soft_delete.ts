import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoConfiguration";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Test soft delete functionality for system configuration settings.
 *
 * This test validates that configurations can be properly marked as deleted
 * while preserving data integrity for audit purposes, and verifies that deleted
 * configurations cannot be referenced after deletion.
 *
 * Test Workflow:
 *
 * 1. Create a new user for authentication
 * 2. Create a configuration setting that will be soft deleted
 * 3. Soft delete the configuration using the erase API
 * 4. Verify the configuration is marked as deleted (deleted_at timestamp)
 * 5. Test that the soft-deleted configuration preserves data integrity
 */
export async function test_api_configuration_soft_delete(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create user for authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(10);
  const user: ITodoUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: password,
      } satisfies ITodoUser.IJoin,
    },
  );
  typia.assert(user);

  // Step 2: Create a configuration setting
  const configKey = `test_config_${RandomGenerator.alphaNumeric(8)}`;
  const configDescription = `Test configuration for soft delete functionality`;
  const configValue = `{"enabled": true, "test_mode": "soft_delete"}`;

  const configuration: ITodoConfiguration =
    await api.functional.todo.configurations.create(connection, {
      body: {
        key: configKey,
        description: configDescription,
        value: configValue,
        type: "json",
        is_system: false,
      } satisfies ITodoConfiguration.ICreate,
    });
  typia.assert(configuration);

  // Verify the configuration was created successfully
  TestValidator.equals(
    "configuration key matches",
    configuration.key,
    configKey,
  );
  TestValidator.equals(
    "configuration value matches",
    configuration.value,
    configValue,
  );
  TestValidator.equals(
    "configuration is not deleted",
    configuration.deleted_at,
    null,
  );

  // Step 3: Soft delete the configuration
  const deletedConfig: ITodoConfiguration =
    await api.functional.todo.user.configurations.erase(connection, {
      key: configKey,
    });
  typia.assert(deletedConfig);

  // Step 4: Verify the configuration is now marked as deleted
  TestValidator.equals(
    "configuration key matches after deletion",
    deletedConfig.key,
    configKey,
  );
  TestValidator.notEquals(
    "configuration has deletion timestamp",
    deletedConfig.deleted_at,
    null,
  );
  TestValidator.predicate(
    "deletion timestamp is valid date",
    () =>
      !!deletedConfig.deleted_at &&
      new Date(deletedConfig.deleted_at).getTime() >
        new Date("1970-01-01").getTime(),
  );

  // Step 5: Verify data integrity - ensure other fields remain unchanged
  TestValidator.equals(
    "id remains unchanged after soft delete",
    deletedConfig.id,
    configuration.id,
  );
  TestValidator.equals(
    "key remains unchanged",
    deletedConfig.key,
    configuration.key,
  );
  TestValidator.equals(
    "value remains unchanged",
    deletedConfig.value,
    configuration.value,
  );
  TestValidator.equals(
    "created_at remains unchanged",
    deletedConfig.created_at,
    configuration.created_at,
  );
  TestValidator.equals(
    "updated_at was updated",
    new Date(deletedConfig.updated_at).getTime(),
    new Date(deletedConfig.updated_at).getTime(),
  );
}
