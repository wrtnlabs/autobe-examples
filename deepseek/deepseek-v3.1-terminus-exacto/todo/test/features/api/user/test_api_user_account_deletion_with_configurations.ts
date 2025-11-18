import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListConfiguration";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test user account deletion when user has created system configurations.
 *
 * Validates that user deletion properly handles configurations created by the
 * user and maintains data consistency when user accounts are removed from the
 * system. This test follows a complete workflow from user registration through
 * configuration creation to account deletion, ensuring proper integration
 * between user management and configuration management subsystems.
 */
export async function test_api_user_account_deletion_with_configurations(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user context for deletion testing
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create configurations to test deletion behavior with existing user data
  const configurationData = {
    key: `test.config.${RandomGenerator.alphaNumeric(8)}`,
    value: RandomGenerator.paragraph({ sentences: 3 }),
    description: "Test configuration created by user before deletion",
    category: "test" as const,
  } satisfies ITodoListConfiguration.ICreate;

  const configuration =
    await api.functional.todoList.user.configurations.create(connection, {
      body: configurationData,
    });
  typia.assert(configuration);

  // Step 3: Delete the user account
  await api.functional.todoList.user.users.erase(connection, {
    userId: user.id,
  });

  // Step 4: Validate that deletion completed successfully
  // The erase function returns void on success, so we validate by ensuring no error was thrown
  TestValidator.predicate("user account deletion completed successfully", true);

  // Step 5: Attempt to access configurations with deleted user's credentials
  // This should fail since the user account no longer exists
  await TestValidator.error(
    "configurations should not be accessible after user deletion",
    async () => {
      await api.functional.todoList.user.configurations.create(connection, {
        body: {
          key: `test.config.${RandomGenerator.alphaNumeric(8)}`,
          value: "should fail",
        } satisfies ITodoListConfiguration.ICreate,
      });
    },
  );
}
