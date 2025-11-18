import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfig";
import type { ITodoListSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfiguration";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test updating an existing system configuration entry by modifying only the
 * config_value field.
 *
 * This test validates the complete workflow for updating system configuration:
 *
 * 1. Authenticate as a user to establish authorized context
 * 2. Create an initial system configuration with all required fields
 * 3. Update the configuration value while keeping other fields unchanged
 * 4. Verify version number increments, updated_at timestamp is current
 * 5. Confirm all fields are correctly preserved and returned in response
 *
 * The test ensures data integrity and proper audit trail maintenance through
 * version tracking and timestamp updates.
 */
export async function test_api_system_configuration_update_value_only(
  connection: api.IConnection,
) {
  // Step 1: Authenticate user to establish authorization context
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create initial system configuration entry
  const configKey = `test_config_${RandomGenerator.alphaNumeric(8)}`;
  const initialValue = RandomGenerator.paragraph({ sentences: 2 });
  const description = RandomGenerator.paragraph({ sentences: 1 });

  const created: ITodoListSystemConfig =
    await api.functional.todoList.systemConfigurations.create(connection, {
      body: {
        config_key: configKey,
        config_value: initialValue,
        value_type: "string",
        description: description,
      } satisfies ITodoListSystemConfig.ICreate,
    });
  typia.assert(created);

  // Validate initial configuration state
  TestValidator.equals(
    "initial config key matches",
    created.config_key,
    configKey,
  );
  TestValidator.equals(
    "initial config value matches",
    created.config_value,
    initialValue,
  );
  TestValidator.equals(
    "initial value type is string",
    created.value_type,
    "string",
  );
  TestValidator.equals(
    "initial description matches",
    created.description,
    description,
  );
  TestValidator.equals("initial version is 1", created.version, 1);

  // Step 3: Wait a small moment to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Step 4: Update configuration value only
  const updatedValue = RandomGenerator.paragraph({ sentences: 3 });

  const updated: ITodoListSystemConfiguration =
    await api.functional.todoList.user.systemConfigurations.update(connection, {
      configKey: configKey,
      body: {
        config_value: updatedValue,
      } satisfies ITodoListSystemConfiguration.IUpdate,
    });
  typia.assert(updated);

  // Step 5: Verify update results
  TestValidator.equals(
    "updated config key unchanged",
    updated.config_key,
    created.config_key,
  );
  TestValidator.equals(
    "config value updated",
    updated.config_value,
    updatedValue,
  );
  TestValidator.equals(
    "value type unchanged",
    updated.value_type,
    created.value_type,
  );
  TestValidator.equals(
    "description unchanged",
    updated.description,
    created.description,
  );
  TestValidator.equals("version incremented by 1", updated.version, 2);
  TestValidator.equals("id unchanged", updated.id, created.id);

  // Step 6: Verify timestamps
  TestValidator.equals(
    "created_at timestamp unchanged",
    updated.created_at,
    created.created_at,
  );
  TestValidator.predicate(
    "updated_at timestamp is after original creation",
    new Date(updated.updated_at) > new Date(created.updated_at),
  );
}
