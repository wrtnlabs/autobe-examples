import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfig";
import type { ITodoListSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfiguration";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test toggling a feature flag configuration between enabled and disabled
 * states.
 *
 * This comprehensive test validates the feature flag toggle workflow:
 *
 * 1. User authentication establishes the necessary authorization context
 * 2. Feature flag 'enable_feature_flag_xyz' is created with value 'false'
 *    (disabled)
 * 3. Feature flag is updated to 'true' to enable the feature with version
 *    increment verification
 * 4. Feature flag is updated back to 'false' to disable the feature with version
 *    increment verification
 * 5. Each update is validated to ensure proper state management and version
 *    tracking
 *
 * This demonstrates realistic feature flag management where system
 * administrators can toggle feature availability at runtime without code
 * changes, with full audit trail through version numbers.
 */
export async function test_api_system_configuration_update_feature_flag_toggle(
  connection: api.IConnection,
) {
  // Step 1: Authenticate user to establish authorization context
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const password: string = RandomGenerator.alphabets(12);

  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create feature flag configuration with initial value 'false' (disabled)
  const featureFlagKey = "enable_feature_flag_xyz";
  const initialConfig: ITodoListSystemConfig =
    await api.functional.todoList.systemConfigurations.create(connection, {
      body: {
        config_key: featureFlagKey,
        config_value: "false",
        value_type: "boolean",
        description: "Feature flag to toggle XYZ feature availability",
      } satisfies ITodoListSystemConfig.ICreate,
    });
  typia.assert(initialConfig);

  // Verify initial state
  TestValidator.equals(
    "initial config key matches",
    initialConfig.config_key,
    featureFlagKey,
  );
  TestValidator.equals(
    "initial config value is false",
    initialConfig.config_value,
    "false",
  );
  TestValidator.equals(
    "initial config value_type is boolean",
    initialConfig.value_type,
    "boolean",
  );
  TestValidator.equals("initial version is 1", initialConfig.version, 1);

  // Step 3: Update feature flag to 'true' to enable the feature
  const enabledConfig: ITodoListSystemConfiguration =
    await api.functional.todoList.user.systemConfigurations.update(connection, {
      configKey: featureFlagKey,
      body: {
        config_value: "true",
        description:
          "Feature flag to toggle XYZ feature availability - ENABLED",
      } satisfies ITodoListSystemConfiguration.IUpdate,
    });
  typia.assert(enabledConfig);

  // Verify enabled state and version increment
  TestValidator.equals(
    "enabled config key matches",
    enabledConfig.config_key,
    featureFlagKey,
  );
  TestValidator.equals(
    "enabled config value is true",
    enabledConfig.config_value,
    "true",
  );
  TestValidator.equals(
    "enabled config value_type is boolean",
    enabledConfig.value_type,
    "boolean",
  );
  TestValidator.equals(
    "version incremented to 2 after first update",
    enabledConfig.version,
    2,
  );

  // Verify timestamp was updated
  TestValidator.predicate(
    "updated_at timestamp changed after enable",
    new Date(enabledConfig.updated_at).getTime() >=
      new Date(initialConfig.updated_at).getTime(),
  );

  // Step 4: Update feature flag back to 'false' to disable the feature
  const disabledConfig: ITodoListSystemConfiguration =
    await api.functional.todoList.user.systemConfigurations.update(connection, {
      configKey: featureFlagKey,
      body: {
        config_value: "false",
        description:
          "Feature flag to toggle XYZ feature availability - DISABLED",
      } satisfies ITodoListSystemConfiguration.IUpdate,
    });
  typia.assert(disabledConfig);

  // Verify disabled state and version increment
  TestValidator.equals(
    "disabled config key matches",
    disabledConfig.config_key,
    featureFlagKey,
  );
  TestValidator.equals(
    "disabled config value is false",
    disabledConfig.config_value,
    "false",
  );
  TestValidator.equals(
    "disabled config value_type is boolean",
    disabledConfig.value_type,
    "boolean",
  );
  TestValidator.equals(
    "version incremented to 3 after second update",
    disabledConfig.version,
    3,
  );

  // Verify timestamp was updated again
  TestValidator.predicate(
    "updated_at timestamp changed after disable",
    new Date(disabledConfig.updated_at).getTime() >=
      new Date(enabledConfig.updated_at).getTime(),
  );

  // Verify creation timestamp remains unchanged (immutable)
  TestValidator.equals(
    "created_at timestamp unchanged throughout toggles",
    disabledConfig.created_at,
    initialConfig.created_at,
  );
}
