import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfig";
import type { ITodoListSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfiguration";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validates that system configuration update timestamps are accurately
 * recorded.
 *
 * This test ensures the audit trail functionality works correctly by:
 *
 * 1. Authenticating as a user
 * 2. Creating an initial configuration entry
 * 3. Recording the initial updated_at timestamp
 * 4. Waiting briefly to ensure measurable time difference
 * 5. Updating the configuration with new values
 * 6. Verifying the new updated_at timestamp is later than the original
 * 7. Confirming the version number incremented
 *
 * This validates that the system maintains accurate audit trail timestamps and
 * properly tracks configuration changes over time.
 */
export async function test_api_system_configuration_update_timestamp_accuracy(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as user
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(10),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create initial configuration entry
  const configKey = `test_config_${RandomGenerator.alphaNumeric(8)}`;
  const initialConfig: ITodoListSystemConfig =
    await api.functional.todoList.systemConfigurations.create(connection, {
      body: {
        config_key: configKey,
        config_value: "initial_value",
        value_type: "string",
        description: "Test configuration for timestamp accuracy validation",
      } satisfies ITodoListSystemConfig.ICreate,
    });
  typia.assert(initialConfig);

  // Step 3: Record initial state
  const initialUpdatedAt = initialConfig.updated_at;
  const initialVersion = initialConfig.version;

  TestValidator.equals("initial version should be 1", initialVersion, 1);

  // Step 4: Wait briefly to ensure time difference (100ms minimum)
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Step 5: Update the configuration
  const updatedConfig: ITodoListSystemConfiguration =
    await api.functional.todoList.user.systemConfigurations.update(connection, {
      configKey: configKey,
      body: {
        config_value: "updated_value",
        description: "Updated configuration after delay",
      } satisfies ITodoListSystemConfiguration.IUpdate,
    });
  typia.assert(updatedConfig);

  // Step 6: Verify updated_at timestamp is later than initial
  const updatedUpdatedAt = updatedConfig.updated_at;

  TestValidator.predicate(
    "updated_at timestamp should be later than initial",
    () => {
      const initialTime = new Date(initialUpdatedAt).getTime();
      const updatedTime = new Date(updatedUpdatedAt).getTime();
      return updatedTime > initialTime;
    },
  );

  // Step 7: Verify timestamps are different
  TestValidator.notEquals(
    "updated_at should differ from initial",
    initialUpdatedAt,
    updatedUpdatedAt,
  );

  // Step 8: Verify version number incremented
  const expectedVersion = initialVersion + 1;
  TestValidator.equals(
    "version should increment to 2",
    updatedConfig.version,
    expectedVersion,
  );

  // Step 9: Verify the configuration key and value match
  TestValidator.equals(
    "config key should remain unchanged",
    updatedConfig.config_key,
    configKey,
  );

  TestValidator.equals(
    "config value should be updated",
    updatedConfig.config_value,
    "updated_value",
  );
}
