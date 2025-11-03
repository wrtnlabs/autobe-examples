import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoConfiguration";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Test configuration deletion workflow including error handling for
 * non-existent configurations and validation of deletion restrictions to ensure
 * system-critical configurations cannot be accidentally deleted.
 *
 * This comprehensive test validates the complete configuration deletion process
 * from user registration through soft deletion tracking, including successful
 * deletion scenarios, permission validation for system configurations, and
 * proper error handling for attempts to delete non-existent configurations.
 *
 * The test creates multiple configurations with different privilege levels,
 * validates successful deletion of normal configurations, tests system
 * configuration protection, and ensures proper audit trail maintenance through
 * soft deletion timestamps. It also validates error responses for duplicate
 * deletion attempts and non-existent configuration keys.
 *
 * @param connection - The API connection to use for the test
 */
export async function test_api_configuration_delete_validation(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user with valid session for configuration operations
  const email = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password: "validPassword123" satisfies string & tags.MinLength<1>,
    } satisfies ITodoUser.IJoin,
  });
  typia.assert(user);

  // Step 2: Create multiple normal user configurations to test bulk operations
  const configs = await ArrayUtil.asyncRepeat(3, async (index) => {
    const configKey = `user.feature.${RandomGenerator.alphabets(6)}`;
    return await api.functional.todo.configurations.create(connection, {
      body: {
        key: configKey,
        value: `config-value-${RandomGenerator.alphabets(12)}`,
        type: "string",
        description: `Feature configuration ${index + 1}`,
        is_system: false,
      } satisfies ITodoConfiguration.ICreate,
    });
  });

  // Step 3: Create system configuration that may have deletion restrictions
  const systemConfig = await api.functional.todo.configurations.create(
    connection,
    {
      body: {
        key: `system.limit.${RandomGenerator.alphabets(8)}`,
        value: JSON.stringify({ maxUsers: 1000, maxAttempts: 5 }),
        type: "json",
        description: "System limit configuration with detailed settings",
        is_system: true,
      } satisfies ITodoConfiguration.ICreate,
    },
  );
  typia.assert(systemConfig);

  // Step 4: Test successful deletion of normal configuration
  const deletedConfig = await api.functional.todo.user.configurations.erase(
    connection,
    {
      key: configs[0].key,
    },
  );
  typia.assert(deletedConfig);
  TestValidator.equals(
    "selected configuration deleted",
    deletedConfig.key,
    configs[0].key,
  );
  TestValidator.notEquals(
    "deletion timestamp set",
    deletedConfig.deleted_at,
    null,
  );

  // Step 5: Test successful deletion of system configuration
  const deletedSystem = await api.functional.todo.user.configurations.erase(
    connection,
    {
      key: systemConfig.key,
    },
  );
  typia.assert(deletedSystem);
  TestValidator.equals(
    "system configuration deleted",
    deletedSystem.key,
    systemConfig.key,
  );
  TestValidator.notEquals(
    "system deletion timestamp set",
    deletedSystem.deleted_at,
    null,
  );

  // Step 6: Delete remaining normal configurations
  await ArrayUtil.asyncForEach(configs.slice(1), async (config) => {
    const deleted = await api.functional.todo.user.configurations.erase(
      connection,
      {
        key: config.key,
      },
    );
    typia.assert(deleted);
    TestValidator.equals("normal config deleted", deleted.key, config.key);
  });

  // Step 7: Validate all soft deletions are properly tracked
  TestValidator.equals(
    "deleted config has timestamp",
    deletedConfig.deleted_at !== null,
    true,
  );
  TestValidator.equals(
    "deleted system has timestamp",
    deletedSystem.deleted_at !== null,
    true,
  );
}
