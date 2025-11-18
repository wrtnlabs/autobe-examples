import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfig";
import type { ITodoListSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfiguration";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_system_configuration_update_string_value_modification(
  connection: api.IConnection,
) {
  // Step 1: Authenticate user by joining/registering
  const userEmail = typia.random<string & tags.Format<"email">>();
  const newUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: RandomGenerator.alphabets(12),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(newUser);

  // Step 2: Create a string-type system configuration
  const configKey = `test_string_config_${RandomGenerator.alphaNumeric(8)}`;
  const initialValue = RandomGenerator.paragraph({ sentences: 2 });

  const createdConfig =
    await api.functional.todoList.systemConfigurations.create(connection, {
      body: {
        config_key: configKey,
        config_value: initialValue,
        value_type: "string",
        description: "Test string configuration for modification",
      } satisfies ITodoListSystemConfig.ICreate,
    });
  typia.assert(createdConfig);

  // Step 3: Verify initial configuration state
  TestValidator.equals(
    "created config key matches",
    createdConfig.config_key,
    configKey,
  );
  TestValidator.equals(
    "created config value matches",
    createdConfig.config_value,
    initialValue,
  );
  TestValidator.equals(
    "created config value_type is string",
    createdConfig.value_type,
    "string",
  );
  TestValidator.equals(
    "created config version starts at 1",
    createdConfig.version,
    1,
  );

  // Step 4: Update the configuration value to a new string
  const updatedValue = RandomGenerator.paragraph({ sentences: 3 });
  const updatedDescription = "Updated string configuration description";

  const updateResponse =
    await api.functional.todoList.user.systemConfigurations.update(connection, {
      configKey: configKey,
      body: {
        config_value: updatedValue,
        description: updatedDescription,
      } satisfies ITodoListSystemConfiguration.IUpdate,
    });
  typia.assert(updateResponse);

  // Step 5: Verify the update succeeded
  TestValidator.equals(
    "updated config key unchanged",
    updateResponse.config_key,
    configKey,
  );
  TestValidator.equals(
    "config value updated to new string",
    updateResponse.config_value,
    updatedValue,
  );
  TestValidator.notEquals(
    "updated value differs from initial",
    updateResponse.config_value,
    initialValue,
  );

  // Step 6: Verify value_type remains string (unchanged)
  TestValidator.equals(
    "value_type remains string",
    updateResponse.value_type,
    "string",
  );

  // Step 7: Verify version incremented
  TestValidator.equals(
    "version incremented after update",
    updateResponse.version,
    2,
  );

  // Step 8: Verify description was updated
  TestValidator.equals(
    "description updated",
    updateResponse.description,
    updatedDescription,
  );

  // Step 9: Verify timestamps
  TestValidator.predicate(
    "created_at is valid ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(updateResponse.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(updateResponse.updated_at),
  );
}
