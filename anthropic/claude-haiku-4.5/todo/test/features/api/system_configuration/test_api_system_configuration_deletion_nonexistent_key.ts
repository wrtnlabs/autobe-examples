import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test deletion attempt with a nonexistent configuration key.
 *
 * This test validates that the API properly handles deletion requests for
 * system configuration entries that do not exist in the system. It ensures the
 * API returns an appropriate error response rather than silently succeeding or
 * returning misleading responses.
 *
 * Test flow:
 *
 * 1. Authenticate user by creating a new account via join endpoint
 * 2. Attempt to delete a system configuration with a nonexistent key
 * 3. Verify that the API returns an error indicating the configuration does not
 *    exist
 */
export async function test_api_system_configuration_deletion_nonexistent_key(
  connection: api.IConnection,
) {
  // Step 1: Authenticate user by creating a new account
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphabets(8);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  const userAuthResponse = await api.functional.auth.user.join(connection, {
    body: {
      email: email,
      password: password,
      href: href,
      referrer: referrer,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(userAuthResponse);

  // Step 2: Attempt to delete a nonexistent configuration key
  // Use a configuration key that does not exist
  const nonexistentConfigKey = "nonexistent_config_key";

  // Step 3: Verify that the API returns an error for nonexistent configuration
  await TestValidator.error(
    "deletion of nonexistent configuration key should fail",
    async () => {
      await api.functional.todoList.user.systemConfigurations.erase(
        connection,
        {
          configKey: nonexistentConfigKey,
        },
      );
    },
  );
}
