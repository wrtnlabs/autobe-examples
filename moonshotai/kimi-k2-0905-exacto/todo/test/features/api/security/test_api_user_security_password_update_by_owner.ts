import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test updating user security settings including password change by account
 * owner
 *
 * This test validates the complete security update workflow for authenticated
 * users:
 *
 * 1. Create a new user account for testing security features
 * 2. Authenticate the user to establish session
 * 3. Update the user's security settings with new password
 * 4. Verify the password update was successful
 * 5. Verify old password no longer works
 * 6. Test authorization boundaries to ensure users can only update their own
 *    settings
 *
 * The test ensures proper authorization boundaries and validates that security
 * updates function correctly within the todo application authentication
 * system.
 */
export async function test_api_user_security_password_update_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Create user account for security testing
  const userEmail = typia.random<string & tags.Format<"email">>();
  const joinRequest = {
    email: userEmail,
    password: "OldPassword123",
    href: "https://example.com/test",
    referrer: "https://example.com/refer",
  } satisfies ITodoAppUser.IJoin;

  const joinedUser = await api.functional.auth.user.join(connection, {
    body: joinRequest,
  });
  typia.assert(joinedUser);
  TestValidator.equals(
    "joined user email matches request",
    joinedUser.email,
    userEmail,
  );

  // Step 2: Verify authentication was established by checking token
  TestValidator.predicate(
    "access token exists",
    joinedUser.token.access.length > 0,
  );
  TestValidator.predicate(
    "token expiration set",
    joinedUser.token.expired_at.length > 0,
  );

  // Step 3: Update security settings with new password
  const newPassword = "NewSecurePassword456";
  const securityUpdate = {
    password_hash: newPassword,
  } satisfies ITodoAppUser.IUpdate;

  await api.functional.todoApp.user.auth.users.security.updateSecurity(
    connection,
    {
      userId: joinedUser.id,
      body: securityUpdate,
    },
  );

  // Step 4: Verify old password no longer works
  await TestValidator.error(
    "old password should not work after update",
    async () => {
      await api.functional.auth.user.login(connection, {
        body: {
          email: userEmail,
          password: "OldPassword123",
          href: "https://example.com/login-old",
          referrer: "https://example.com/refer",
        } satisfies ITodoAppUser.ILogin,
      });
    },
  );

  // Step 5: Verify password update by attempting to login with new password
  const loginWithNewPassword = await api.functional.auth.user.login(
    connection,
    {
      body: {
        email: userEmail,
        password: newPassword,
        href: "https://example.com/login",
        referrer: "https://example.com/refer",
      } satisfies ITodoAppUser.ILogin,
    },
  );
  typia.assert(loginWithNewPassword);
  TestValidator.equals(
    "login successful with new password",
    loginWithNewPassword.email,
    userEmail,
  );

  // Step 6: Create another user and test authorization boundaries
  const anotherEmail = typia.random<string & tags.Format<"email">>();
  const connectionForAnother = {
    ...connection,
    headers: {}, // Clean connection for new user
  } as api.IConnection;

  const anotherUser = await api.functional.auth.user.join(
    connectionForAnother,
    {
      body: {
        email: anotherEmail,
        password: "AnotherUser789",
        href: "https://example.com/another",
        referrer: "https://example.com/refer",
      } satisfies ITodoAppUser.IJoin,
    },
  );
  typia.assert(anotherUser);

  // Step 7: Test authorization boundaries - cannot update another user's security
  await TestValidator.error(
    "cannot modify another user's security settings",
    async () => {
      await api.functional.todoApp.user.auth.users.security.updateSecurity(
        connection,
        {
          userId: anotherUser.id, // Try to update second user's security with first user's auth
          body: {
            password_hash: "UnauthorizedChange123",
          } satisfies ITodoAppUser.IUpdate,
        },
      );
    },
  );
}
