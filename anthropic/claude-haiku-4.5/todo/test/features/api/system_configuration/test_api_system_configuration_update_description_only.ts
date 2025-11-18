import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfig";
import type { ITodoListSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfiguration";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test updating a system configuration entry by modifying only the description
 * field while keeping the config_value unchanged.
 *
 * This test validates the complete workflow of managing system configuration
 * entries:
 *
 * 1. Authenticate as a user to establish authorization context
 * 2. Create a new system configuration with initial description
 * 3. Update the configuration by changing only the description text
 * 4. Verify the description is updated to new documentation text
 * 5. Confirm version increments from 1 to 2
 * 6. Ensure the config_value remains unchanged after the update
 * 7. Validate the updated configuration is returned with correct properties
 */
export async function test_api_system_configuration_update_description_only(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as a user
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(10),
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);
  TestValidator.predicate("user authenticated successfully", user.id !== null);

  // Step 2: Create a system configuration with initial description
  const configKey = `test_config_${RandomGenerator.alphaNumeric(8)}`;
  const initialDescription = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const configValue = "production";

  const createdConfig: ITodoListSystemConfig =
    await api.functional.todoList.systemConfigurations.create(connection, {
      body: {
        config_key: configKey,
        config_value: configValue,
        value_type: "string",
        description: initialDescription,
      } satisfies ITodoListSystemConfig.ICreate,
    });
  typia.assert(createdConfig);
  TestValidator.equals(
    "created config key matches",
    createdConfig.config_key,
    configKey,
  );
  TestValidator.equals(
    "created config value matches",
    createdConfig.config_value,
    configValue,
  );
  TestValidator.equals(
    "created config description matches",
    createdConfig.description,
    initialDescription,
  );
  TestValidator.equals("initial version is 1", createdConfig.version, 1);

  // Step 3: Update the configuration description only
  const newDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 9,
  });

  const updatedConfig: ITodoListSystemConfiguration =
    await api.functional.todoList.user.systemConfigurations.update(connection, {
      configKey: configKey,
      body: {
        config_value: configValue,
        description: newDescription,
      } satisfies ITodoListSystemConfiguration.IUpdate,
    });
  typia.assert(updatedConfig);

  // Step 4: Verify the description is updated
  TestValidator.equals(
    "updated config key matches",
    updatedConfig.config_key,
    configKey,
  );
  TestValidator.equals(
    "updated description is new text",
    updatedConfig.description,
    newDescription,
  );

  // Step 5: Verify version increments
  TestValidator.equals("version incremented to 2", updatedConfig.version, 2);

  // Step 6: Verify config_value remains unchanged
  TestValidator.equals(
    "config_value unchanged after description update",
    updatedConfig.config_value,
    configValue,
  );

  // Step 7: Verify value_type is preserved
  TestValidator.equals(
    "value_type preserved",
    updatedConfig.value_type,
    "string",
  );
}
