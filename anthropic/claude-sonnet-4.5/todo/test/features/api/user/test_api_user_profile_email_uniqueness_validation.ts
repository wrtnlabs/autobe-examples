import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test email uniqueness validation when updating user profiles.
 *
 * This test validates that the system properly enforces the email uniqueness
 * constraint across all user accounts. When a user attempts to change their
 * email address to one that is already registered by another user, the system
 * must reject the update operation to maintain data integrity.
 *
 * Test workflow:
 *
 * 1. Create first user account with a unique email address
 * 2. Create second user account with a different unique email address
 * 3. Authenticate as the first user
 * 4. Attempt to update first user's email to match second user's email
 * 5. Verify the operation fails with an error due to email conflict
 *
 * This ensures the email uniqueness constraint (REQ-BIZ-060) is properly
 * enforced at the application level, preventing duplicate email addresses
 * across different user accounts in the todo_list_users table.
 */
export async function test_api_user_profile_email_uniqueness_validation(
  connection: api.IConnection,
) {
  // Step 1: Create first user account
  const firstUserEmail = typia.random<string & tags.Format<"email">>();
  const firstUserPassword = typia.random<string & tags.MinLength<8>>();

  const firstUser = await api.functional.auth.user.join(connection, {
    body: {
      email: firstUserEmail,
      password: firstUserPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(firstUser);

  // Step 2: Create second user account with different email
  const secondUserEmail = typia.random<string & tags.Format<"email">>();
  const secondUserPassword = typia.random<string & tags.MinLength<8>>();

  const secondUser = await api.functional.auth.user.join(connection, {
    body: {
      email: secondUserEmail,
      password: secondUserPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(secondUser);

  // Verify both users have different emails
  TestValidator.notEquals(
    "first and second user emails should be different",
    firstUser.email,
    secondUser.email,
  );

  // Step 3: Re-authenticate as first user to test their profile update
  // The second join operation switched authentication context to second user,
  // so we need to switch back to first user's context
  await api.functional.auth.user.join(connection, {
    body: {
      email: firstUserEmail,
      password: firstUserPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ICreate,
  });

  // Step 4: Attempt to update first user's email to second user's email
  // This should fail due to uniqueness constraint
  await TestValidator.error(
    "updating email to already-registered address should fail",
    async () => {
      await api.functional.todoList.user.users.me.update(connection, {
        body: {
          email: secondUserEmail,
        } satisfies ITodoListUser.IUpdate,
      });
    },
  );
}
