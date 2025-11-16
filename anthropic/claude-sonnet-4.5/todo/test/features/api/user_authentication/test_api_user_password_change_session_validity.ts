import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that password change operation requires valid authentication session.
 *
 * This test validates the authentication requirement for the password change
 * endpoint. It creates a new user account to establish a valid user in the
 * system, then attempts to call the password change endpoint without valid
 * authentication credentials.
 *
 * The test verifies that the password change operation properly enforces
 * authentication by rejecting unauthenticated requests. This ensures that only
 * users with valid authentication sessions can modify their passwords,
 * preventing unauthorized password changes.
 *
 * Test workflow:
 *
 * 1. Create a new user account via join operation
 * 2. Verify the account was created successfully
 * 3. Create an unauthenticated connection (no authorization headers)
 * 4. Attempt to change password without authentication
 * 5. Verify the operation fails due to missing authentication
 */
export async function test_api_user_password_change_session_validity(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account via join operation
  const userEmail = typia.random<string & tags.Format<"email">>();
  const originalPassword = "SecurePass123!";
  const newPassword = "NewSecurePass456!";

  const createUserBody = {
    email: userEmail,
    password: originalPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListUser.ICreate;

  const createdUser = await api.functional.auth.user.join(connection, {
    body: createUserBody,
  });
  typia.assert(createdUser);

  // Step 2: Verify user was created successfully
  TestValidator.equals("user email matches", createdUser.email, userEmail);
  TestValidator.predicate(
    "user has authentication token",
    createdUser.token.access.length > 0,
  );

  // Step 3: Create an unauthenticated connection (empty headers)
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 4: Attempt to change password without authentication - should fail
  const changePasswordBody = {
    current_password: originalPassword,
    new_password: newPassword,
  } satisfies ITodoListUser.IChangePassword;

  await TestValidator.error(
    "password change should fail without authentication",
    async () => {
      await api.functional.auth.user.password.change.changePassword(
        unauthConnection,
        {
          body: changePasswordBody,
        },
      );
    },
  );
}
