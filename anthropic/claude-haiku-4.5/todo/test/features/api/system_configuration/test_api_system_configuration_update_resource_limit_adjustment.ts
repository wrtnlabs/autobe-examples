import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfig";
import type { ITodoListSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfiguration";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test adjusting a resource limit configuration like 'max_todos_per_user'.
 *
 * This test validates the complete workflow of updating system configuration
 * entries that control application resource constraints. The scenario
 * demonstrates how operations teams can adjust resource limits without
 * requiring code changes or database migrations.
 *
 * Test workflow:
 *
 * 1. Create a user account via authentication to establish user context
 * 2. Create an initial system configuration entry with key 'max_todos_per_user'
 *    and value '10000'
 * 3. Update the configuration to a new limit value '50000'
 * 4. Verify the updated configuration is returned with correct version and
 *    timestamp
 * 5. Validate that the version number incremented and timestamp was updated
 *
 * This demonstrates the flexibility and power of configuration management for
 * operations teams.
 */
export async function test_api_system_configuration_update_resource_limit_adjustment(
  connection: api.IConnection,
) {
  // Step 1: Create a user account via authentication
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);
  TestValidator.equals(
    "user should be authenticated",
    user.user !== undefined,
    true,
  );

  // Step 2: Create initial system configuration with resource limit
  const initialConfig: ITodoListSystemConfig =
    await api.functional.todoList.systemConfigurations.create(connection, {
      body: {
        config_key: "max_todos_per_user",
        config_value: "10000",
        value_type: "integer",
        description: "Maximum number of todos per user for resource management",
      } satisfies ITodoListSystemConfig.ICreate,
    });
  typia.assert(initialConfig);
  TestValidator.equals(
    "initial config key should match",
    initialConfig.config_key,
    "max_todos_per_user",
  );
  TestValidator.equals(
    "initial config value should be 10000",
    initialConfig.config_value,
    "10000",
  );
  TestValidator.equals("initial version should be 1", initialConfig.version, 1);

  // Step 3: Update the configuration to new resource limit
  const updatedConfig: ITodoListSystemConfiguration =
    await api.functional.todoList.user.systemConfigurations.update(connection, {
      configKey: "max_todos_per_user",
      body: {
        config_value: "50000",
        description:
          "Updated maximum number of todos per user - increased resource limit",
      } satisfies ITodoListSystemConfiguration.IUpdate,
    });
  typia.assert(updatedConfig);

  // Step 4: Verify the updated configuration values
  TestValidator.equals(
    "updated config key should match",
    updatedConfig.config_key,
    "max_todos_per_user",
  );
  TestValidator.equals(
    "updated config value should be 50000",
    updatedConfig.config_value,
    "50000",
  );
  TestValidator.equals(
    "value type should remain integer",
    updatedConfig.value_type,
    "integer",
  );
  TestValidator.equals(
    "updated description should be set",
    updatedConfig.description,
    "Updated maximum number of todos per user - increased resource limit",
  );

  // Step 5: Validate version increment and timestamp update
  TestValidator.equals(
    "version should increment to 2",
    updatedConfig.version,
    2,
  );
  TestValidator.predicate(
    "updated_at should be after created_at",
    new Date(updatedConfig.updated_at) >= new Date(updatedConfig.created_at),
  );

  // Step 6: Verify resource limit was successfully increased
  TestValidator.predicate(
    "resource limit increased successfully",
    parseInt(updatedConfig.config_value) > parseInt(initialConfig.config_value),
  );
}
