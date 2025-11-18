import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfiguration";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test updating a configuration that does not exist.
 *
 * This test validates that the system properly prevents updates to non-existent
 * system configurations. It attempts to update a configuration with a configKey
 * that was never created, verifying that:
 *
 * 1. User authentication is established
 * 2. Update operation fails when targeting non-existent configuration
 * 3. System returns appropriate error (404 or similar) for missing configuration
 * 4. Configuration existence is validated before accepting updates
 *
 * This ensures data integrity and prevents orphaned/invalid updates in the
 * system.
 */
export async function test_api_system_configuration_update_nonexistent_configuration(
  connection: api.IConnection,
) {
  // Step 1: Authenticate user to establish session
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(10),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Attempt to update a non-existent configuration
  const nonexistentConfigKey = `nonexistent_config_${RandomGenerator.alphaNumeric(12)}`;

  // Step 3: Verify the operation fails with not-found error
  await TestValidator.error(
    "should fail when updating non-existent configuration",
    async () => {
      await api.functional.todoList.user.systemConfigurations.update(
        connection,
        {
          configKey: nonexistentConfigKey,
          body: {
            config_value: "some_value",
            description: "Test description for non-existent config",
          } satisfies ITodoListSystemConfiguration.IUpdate,
        },
      );
    },
  );
}
