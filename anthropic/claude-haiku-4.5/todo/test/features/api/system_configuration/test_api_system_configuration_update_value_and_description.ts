import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfig";
import type { ITodoListSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfiguration";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test updating both the config_value and description fields of a system
 * configuration in a single operation.
 *
 * This test validates the system configuration update functionality by creating
 * a configuration entry, then updating both the value and description fields
 * simultaneously. It verifies that the version increments correctly, timestamps
 * are updated properly, and the response contains the fully updated
 * configuration with all changes persisted.
 *
 * Test workflow:
 *
 * 1. Authenticate as a user to establish authorization context
 * 2. Create a system configuration entry with initial key, value, type, and
 *    description
 * 3. Update both config_value and description fields in a single request
 * 4. Validate that the version incremented from 1 to 2
 * 5. Verify the updated_at timestamp reflects the change
 * 6. Confirm both config_value and description contain the new values
 * 7. Verify all other fields remain unchanged (id, config_key, value_type,
 *    created_at)
 */
export async function test_api_system_configuration_update_value_and_description(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as user
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(12),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create a system configuration entry
  const configKey = `test_config_${RandomGenerator.alphaNumeric(8)}`;
  const initialValue = RandomGenerator.alphaNumeric(10);
  const initialDescription = RandomGenerator.paragraph({ sentences: 2 });

  const createdConfig: ITodoListSystemConfig =
    await api.functional.todoList.systemConfigurations.create(connection, {
      body: {
        config_key: configKey,
        config_value: initialValue,
        value_type: "string",
        description: initialDescription,
      } satisfies ITodoListSystemConfig.ICreate,
    });
  typia.assert(createdConfig);

  // Verify initial creation values
  TestValidator.equals(
    "created config_key matches input",
    createdConfig.config_key,
    configKey,
  );
  TestValidator.equals(
    "created config_value matches input",
    createdConfig.config_value,
    initialValue,
  );
  TestValidator.equals(
    "created value_type matches input",
    createdConfig.value_type,
    "string",
  );
  TestValidator.equals(
    "created description matches input",
    createdConfig.description,
    initialDescription,
  );
  TestValidator.equals("initial version is 1", createdConfig.version, 1);

  // Step 3: Update both config_value and description
  const newValue = RandomGenerator.alphaNumeric(12);
  const newDescription = RandomGenerator.paragraph({ sentences: 3 });

  const updatedConfig: ITodoListSystemConfiguration =
    await api.functional.todoList.user.systemConfigurations.update(connection, {
      configKey: configKey,
      body: {
        config_value: newValue,
        description: newDescription,
      } satisfies ITodoListSystemConfiguration.IUpdate,
    });
  typia.assert(updatedConfig);

  // Step 4: Validate version incremented correctly
  TestValidator.equals(
    "version incremented to 2 after update",
    updatedConfig.version,
    2,
  );

  // Step 5: Verify updated_at timestamp is newer than created_at
  const createdTime = new Date(createdConfig.created_at).getTime();
  const updatedTime = new Date(updatedConfig.updated_at).getTime();
  TestValidator.predicate(
    "updated_at is newer than created_at",
    updatedTime > createdTime,
  );

  // Step 6: Confirm both config_value and description are updated
  TestValidator.equals(
    "config_value updated to new value",
    updatedConfig.config_value,
    newValue,
  );
  TestValidator.equals(
    "description updated to new value",
    updatedConfig.description,
    newDescription,
  );

  // Step 7: Verify unchanged fields remain the same
  TestValidator.equals(
    "config_key unchanged after update",
    updatedConfig.config_key,
    configKey,
  );
  TestValidator.equals(
    "value_type unchanged after update",
    updatedConfig.value_type,
    "string",
  );
  TestValidator.equals(
    "created_at unchanged after update",
    updatedConfig.created_at,
    createdConfig.created_at,
  );
  TestValidator.equals(
    "id unchanged after update",
    updatedConfig.id,
    createdConfig.id,
  );
}
