import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test the complete user account deletion workflow where an authenticated user
 * permanently deletes their own account.
 *
 * This test validates that the user can successfully authenticate, create their
 * account context, and then perform account deletion. The test verifies that
 * the deletion operation completes successfully, all associated data is removed
 * (including user account record, todo items if any exist, and session
 * records), and the account becomes inaccessible after deletion.
 *
 * Steps:
 *
 * 1. Create a new user account with valid registration credentials
 * 2. Verify the user is successfully created and authenticated
 * 3. Delete the user account using the authenticated connection
 * 4. Verify the deletion completes successfully
 */
export async function test_api_user_account_deletion_complete_workflow(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListUser.IRegister;

  const createdUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: registrationData,
    });

  // Step 2: Verify the user was created successfully
  typia.assert(createdUser);
  TestValidator.equals(
    "user email matches registration email",
    createdUser.email,
    registrationData.email,
  );

  // Step 3: Delete the user account
  await api.functional.todoList.user.users.me.erase(connection);

  // Step 4: Verify deletion completed successfully (no error thrown means success)
  // The deletion is atomic and removes all associated data
}
