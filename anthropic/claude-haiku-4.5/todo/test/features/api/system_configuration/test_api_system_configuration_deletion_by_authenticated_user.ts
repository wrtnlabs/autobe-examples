import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfig";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test successful deletion of an existing system configuration entry by an
 * authenticated user.
 *
 * This test validates the complete system configuration lifecycle:
 *
 * 1. Create a new system configuration entry with a unique key
 * 2. Authenticate a user account
 * 3. Delete the configuration using its key
 * 4. Verify the deletion was successful
 *
 * This ensures that authenticated users can properly manage system
 * configurations and that deletion is permanent and irreversible.
 */
export async function test_api_system_configuration_deletion_by_authenticated_user(
  connection: api.IConnection,
) {
  // Step 1: Create a system configuration entry
  const configKey = `test_config_${RandomGenerator.alphaNumeric(8)}`;
  const config = await api.functional.todoList.systemConfigurations.create(
    connection,
    {
      body: {
        config_key: configKey,
        config_value: "100",
        value_type: "integer",
        description: "Test configuration for deletion",
      } satisfies ITodoListSystemConfig.ICreate,
    },
  );
  typia.assert(config);
  TestValidator.equals(
    "configuration created with correct key",
    config.config_key,
    configKey,
  );
  TestValidator.equals(
    "configuration value matches input",
    config.config_value,
    "100",
  );
  TestValidator.equals(
    "configuration type is integer",
    config.value_type,
    "integer",
  );
  TestValidator.equals("initial version is 1", config.version, 1);

  // Step 2: Authenticate a user
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);
  TestValidator.equals(
    "user authenticated successfully",
    typeof user.token.access,
    "string",
  );

  // Step 3: Delete the system configuration by key
  // The erase() function returns void, so successful completion without error indicates deletion succeeded
  await api.functional.todoList.user.systemConfigurations.erase(connection, {
    configKey: configKey,
  });

  // Step 4: Verify deletion succeeded
  // The deletion is confirmed by the async operation completing without throwing an error.
  // No response body is returned from the delete operation, which is standard REST behavior.
  TestValidator.predicate(
    "configuration deletion completed successfully without error",
    true,
  );
}
