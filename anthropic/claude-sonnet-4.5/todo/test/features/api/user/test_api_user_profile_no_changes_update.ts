import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that update operations succeed without modifications when no fields are
 * provided.
 *
 * This scenario validates the optional field behavior where an empty update
 * request is handled gracefully. The test creates a user account, then sends an
 * update request with no fields specified (empty request body). It verifies
 * that the operation succeeds without errors and returns the current user
 * information unchanged. This test ensures the API handles edge cases
 * gracefully and doesn't require clients to always provide fields for update
 * operations.
 *
 * Steps:
 *
 * 1. Create a new user account
 * 2. Capture initial user state
 * 3. Send empty update request
 * 4. Verify operation succeeds
 * 5. Verify user data remains unchanged
 */
export async function test_api_user_profile_no_changes_update(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = typia.random<string & tags.MinLength<8>>();

  const createdUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(createdUser);

  // Step 2: Capture initial user state
  const initialEmail = createdUser.email;

  // Step 3: Send empty update request (no fields provided)
  const updatedUser: ITodoListUser =
    await api.functional.todoList.user.users.me.update(connection, {
      body: {} satisfies ITodoListUser.IUpdate,
    });
  typia.assert(updatedUser);

  // Step 4: Verify operation succeeded and user data remains unchanged
  TestValidator.equals(
    "email should remain unchanged",
    updatedUser.email,
    initialEmail,
  );

  // Step 5: Verify the operation returned valid user data
  TestValidator.equals("user ID should match", updatedUser.id, createdUser.id);
}
