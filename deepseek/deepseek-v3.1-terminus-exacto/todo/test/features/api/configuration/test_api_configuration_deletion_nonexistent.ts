import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test error handling scenario where a user attempts to delete a configuration
 * that does not exist in the system.
 *
 * This test validates that the system appropriately handles deletion attempts
 * for non-existent configurations by returning a proper error response rather
 * than allowing deletion of non-existent records. The test follows a complete
 * authentication workflow to establish proper user context before attempting
 * the deletion.
 */
export async function test_api_configuration_deletion_nonexistent(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Generate a random configuration key that does not exist
  const nonExistentConfigurationKey = RandomGenerator.alphaNumeric(16);

  // Step 3: Attempt to delete the non-existent configuration
  await TestValidator.error(
    "deleting non-existent configuration should fail",
    async () => {
      await api.functional.todoList.user.configurations.erase(connection, {
        configurationKey: nonExistentConfigurationKey,
      });
    },
  );
}
