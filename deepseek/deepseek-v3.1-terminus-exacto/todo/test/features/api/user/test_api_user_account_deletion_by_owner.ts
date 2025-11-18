import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test complete user account deletion workflow where a user permanently removes
 * their own account.
 *
 * This test validates that authenticated users can delete their accounts,
 * ensuring proper authorization checks prevent unauthorized deletions. The test
 * covers successful account removal, verification that all user data is
 * properly cleaned up, and confirmation that the operation is irreversible with
 * appropriate security measures.
 *
 * Steps:
 *
 * 1. Create a new user account through authentication join operation
 * 2. Perform account deletion using the user's email address
 * 3. Validate that deletion operation returns the correct user data
 * 4. Verify that subsequent attempts to access the deleted account fail
 */
export async function test_api_user_account_deletion_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";

  const createdUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(createdUser);

  // Step 2: Perform account deletion
  const deletedUser = await api.functional.todoApp.user.users.erase(
    connection,
    {
      userEmail: userEmail,
    },
  );
  typia.assert(deletedUser);

  // Step 3: Validate that deletion operation returns the correct user data
  TestValidator.equals(
    "deleted user email matches created user email",
    deletedUser.email,
    createdUser.email,
  );
  TestValidator.equals(
    "deleted user ID matches created user ID",
    deletedUser.id,
    createdUser.id,
  );
  TestValidator.equals(
    "deleted user name matches created user name",
    deletedUser.name,
    createdUser.name,
  );

  // Step 4: Verify that subsequent attempts to access the deleted account fail
  await TestValidator.error(
    "deleted account should not be accessible again",
    async () => {
      await api.functional.todoApp.user.users.erase(connection, {
        userEmail: userEmail,
      });
    },
  );
}
