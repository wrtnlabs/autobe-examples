import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfig";
import type { ITodoListSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfiguration";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_system_configuration_update_deployment_environment_change(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as user
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePassword123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create initial deployment_environment configuration with 'staging' value
  const initialConfig =
    await api.functional.todoList.systemConfigurations.create(connection, {
      body: {
        config_key: "deployment_environment",
        config_value: "staging",
        value_type: "string",
        description: "Current deployment environment for the system",
      } satisfies ITodoListSystemConfig.ICreate,
    });
  typia.assert(initialConfig);
  TestValidator.equals(
    "initial deployment environment value is staging",
    initialConfig.config_value,
    "staging",
  );
  TestValidator.equals("initial version number is 1", initialConfig.version, 1);

  // Step 3: Update deployment environment configuration to 'production'
  const updatedConfig =
    await api.functional.todoList.user.systemConfigurations.update(connection, {
      configKey: "deployment_environment",
      body: {
        config_value: "production",
        description: "Environment updated to production for live deployment",
      } satisfies ITodoListSystemConfiguration.IUpdate,
    });
  typia.assert(updatedConfig);

  // Step 4: Verify the configuration was successfully updated
  TestValidator.equals(
    "deployment environment value updated to production",
    updatedConfig.config_value,
    "production",
  );
  TestValidator.equals(
    "configuration key matches",
    updatedConfig.config_key,
    "deployment_environment",
  );
  TestValidator.equals(
    "value type remains string",
    updatedConfig.value_type,
    "string",
  );

  // Step 5: Verify version number incremented
  TestValidator.equals(
    "version number incremented to 2",
    updatedConfig.version,
    2,
  );

  // Step 6: Verify updated_at timestamp changed
  TestValidator.notEquals(
    "updated_at timestamp changed after modification",
    updatedConfig.updated_at,
    initialConfig.updated_at,
  );

  // Step 7: Verify description was updated
  TestValidator.equals(
    "description updated successfully",
    updatedConfig.description,
    "Environment updated to production for live deployment",
  );
}
