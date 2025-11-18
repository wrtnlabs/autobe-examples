import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfig";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_system_configuration_deletion_special_characters_in_key(
  connection: api.IConnection,
) {
  // Step 1: Register a new user for authentication
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Test@1234567890",
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000/",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create system configurations with special characters in keys
  const configKey1 = "max_todos_per_user";
  const config1: ITodoListSystemConfig =
    await api.functional.todoList.systemConfigurations.create(connection, {
      body: {
        config_key: configKey1,
        config_value: "1000",
        value_type: "integer",
        description: "Maximum number of todos per user",
      } satisfies ITodoListSystemConfig.ICreate,
    });
  typia.assert(config1);
  TestValidator.equals(
    "created config1 key matches",
    config1.config_key,
    configKey1,
  );

  const configKey2 = "feature_flag_v2_enabled";
  const config2: ITodoListSystemConfig =
    await api.functional.todoList.systemConfigurations.create(connection, {
      body: {
        config_key: configKey2,
        config_value: "true",
        value_type: "boolean",
        description: "Feature flag for v2 enabled status",
      } satisfies ITodoListSystemConfig.ICreate,
    });
  typia.assert(config2);
  TestValidator.equals(
    "created config2 key matches",
    config2.config_key,
    configKey2,
  );

  const configKey3 = "api_rate_limit_requests-per-second";
  const config3: ITodoListSystemConfig =
    await api.functional.todoList.systemConfigurations.create(connection, {
      body: {
        config_key: configKey3,
        config_value: "100",
        value_type: "integer",
        description: "API rate limit requests per second",
      } satisfies ITodoListSystemConfig.ICreate,
    });
  typia.assert(config3);
  TestValidator.equals(
    "created config3 key matches",
    config3.config_key,
    configKey3,
  );

  // Step 3: Delete the first configuration with underscore special characters
  await api.functional.todoList.user.systemConfigurations.erase(connection, {
    configKey: configKey1,
  });
  TestValidator.predicate(
    "first configuration with underscores deleted successfully",
    true,
  );

  // Step 4: Delete the second configuration with underscore and version suffix
  await api.functional.todoList.user.systemConfigurations.erase(connection, {
    configKey: configKey2,
  });
  TestValidator.predicate(
    "second configuration with version suffix deleted successfully",
    true,
  );

  // Step 5: Delete the third configuration with dashes and underscores
  await api.functional.todoList.user.systemConfigurations.erase(connection, {
    configKey: configKey3,
  });
  TestValidator.predicate(
    "third configuration with dashes and underscores deleted successfully",
    true,
  );

  // Step 6: Verify error when trying to delete non-existent configuration
  await TestValidator.error(
    "should fail when deleting non-existent configuration",
    async () => {
      await api.functional.todoList.user.systemConfigurations.erase(
        connection,
        {
          configKey: "non_existent_config",
        },
      );
    },
  );
}
