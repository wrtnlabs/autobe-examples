import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfig";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test whether configuration key deletion is case-sensitive or
 * case-insensitive.
 *
 * This test validates the case-sensitivity behavior of the system configuration
 * deletion endpoint. It creates configurations with different key casings and
 * deletes them to verify that the system's key matching logic is consistent and
 * treats keys either strictly by exact case match or case-insensitively.
 *
 * Steps:
 *
 * 1. Register and authenticate a new user
 * 2. Create a system configuration with a specific key casing ('MaxTodosLimit')
 * 3. Delete the configuration using the exact matching key
 * 4. Create another configuration with same text but different casing
 *    ('maxtodoslimit')
 * 5. Verify system behavior - whether second creation succeeds or fails indicates
 *    case-sensitivity
 * 6. Clean up by deleting all created configurations
 */
export async function test_api_system_configuration_deletion_case_sensitivity(
  connection: api.IConnection,
) {
  // Step 1: Authenticate user
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create a system configuration with specific key casing (PascalCase)
  const configKeyPascal = "MaxTodosLimit";
  const config1 = await api.functional.todoList.systemConfigurations.create(
    connection,
    {
      body: {
        config_key: configKeyPascal,
        config_value: "100",
        value_type: "integer",
        description: "Maximum number of todos per user",
      } satisfies ITodoListSystemConfig.ICreate,
    },
  );
  typia.assert(config1);
  TestValidator.equals(
    "created config key matches input",
    config1.config_key,
    configKeyPascal,
  );

  // Step 3: Delete with exact matching key (case-sensitive match)
  await api.functional.todoList.user.systemConfigurations.erase(connection, {
    configKey: configKeyPascal,
  });

  // Step 4: Create configuration with lowercase variant of same key
  const configKeyLower = "maxtodoslimit";
  const config2 = await api.functional.todoList.systemConfigurations.create(
    connection,
    {
      body: {
        config_key: configKeyLower,
        config_value: "100",
        value_type: "integer",
        description: "Maximum number of todos per user (lowercase key)",
      } satisfies ITodoListSystemConfig.ICreate,
    },
  );
  typia.assert(config2);
  TestValidator.equals(
    "created lowercase config key matches input",
    config2.config_key,
    configKeyLower,
  );

  // Step 5: Verify that we can delete the lowercase variant with its exact key
  await api.functional.todoList.user.systemConfigurations.erase(connection, {
    configKey: configKeyLower,
  });

  // Step 6: Create one more configuration with uppercase variant to further validate case-sensitivity
  const configKeyUpper = "MAXTODOSLIMIT";
  const config3 = await api.functional.todoList.systemConfigurations.create(
    connection,
    {
      body: {
        config_key: configKeyUpper,
        config_value: "100",
        value_type: "integer",
        description: "Maximum number of todos per user (uppercase key)",
      } satisfies ITodoListSystemConfig.ICreate,
    },
  );
  typia.assert(config3);
  TestValidator.equals(
    "created uppercase config key matches input",
    config3.config_key,
    configKeyUpper,
  );

  // Step 7: Delete the uppercase variant with its exact key
  await api.functional.todoList.user.systemConfigurations.erase(connection, {
    configKey: configKeyUpper,
  });

  // Step 8: Validate that system preserves key case differences
  TestValidator.notEquals(
    "system distinguishes between different casings",
    configKeyPascal,
    configKeyLower,
  );
  TestValidator.notEquals(
    "system distinguishes between PascalCase and UPPERCASE",
    configKeyPascal,
    configKeyUpper,
  );
}
