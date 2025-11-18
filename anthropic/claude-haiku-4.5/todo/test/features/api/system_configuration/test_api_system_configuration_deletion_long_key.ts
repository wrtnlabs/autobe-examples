import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfig";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test deletion of system configurations with very long key names to validate
 * boundary conditions and string length handling.
 *
 * This test validates that the system correctly handles deletion of
 * configuration entries with extremely long configuration keys, ensuring proper
 * boundary condition handling and database constraint compliance.
 *
 * Workflow:
 *
 * 1. Register a new user account to establish authenticated context
 * 2. Create a system configuration with a very long key (255+ characters)
 * 3. Attempt to delete the configuration using the long key
 * 4. Verify successful deletion through error handling on subsequent operations
 */
export async function test_api_system_configuration_deletion_long_key(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account to establish authenticated context
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);

  const authorized = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(authorized);

  // Step 2: Create a system configuration with a very long key (255+ characters)
  // Generate a long key identifier exceeding typical field length constraints
  const longKey = "config_" + RandomGenerator.alphabets(250);

  const config = await api.functional.todoList.systemConfigurations.create(
    connection,
    {
      body: {
        config_key: longKey,
        config_value: "long_key_test_value",
        value_type: "string",
        description:
          "Configuration entry with extended key name for boundary testing",
      } satisfies ITodoListSystemConfig.ICreate,
    },
  );
  typia.assert(config);
  TestValidator.equals(
    "created config key matches",
    config.config_key,
    longKey,
  );

  // Step 3: Delete the configuration using the long key
  // This validates that the deletion endpoint correctly processes extended key names
  await api.functional.todoList.user.systemConfigurations.erase(connection, {
    configKey: longKey,
  });

  // Step 4: Verify successful deletion by attempting to delete again
  // This confirms the first deletion was successful, as a second deletion should fail
  await TestValidator.error(
    "attempting to delete already-deleted long-key configuration should fail",
    async () => {
      await api.functional.todoList.user.systemConfigurations.erase(
        connection,
        {
          configKey: longKey,
        },
      );
    },
  );

  TestValidator.predicate(
    "long key configuration deletion test completed successfully",
    true,
  );
}
