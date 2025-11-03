import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test that all user sessions are invalidated after successful password change.
 *
 * This test validates session invalidation on password change by:
 *
 * 1. Create a new user account with initial registration
 * 2. Store the initial access token from registration
 * 3. Successfully change the password with correct current password
 * 4. Verify the password change response is successful
 * 5. Attempt to use the old access token - should fail with 401 Unauthorized
 *
 * Security validation: Ensures that password changes invalidate the user's
 * session, preventing unauthorized access from the old session token.
 */
export async function test_api_user_change_password_session_invalidation(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account with initial registration
  const initialEmail = typia.random<string & tags.Format<"email">>();
  const initialPassword = "ValidPassword123"; // 8+ chars for valid password

  const registeredUser: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: initialEmail,
        password: initialPassword,
      } satisfies ITodoAppUser.IJoin,
    });
  typia.assert(registeredUser);

  // Verify initial registration was successful
  TestValidator.equals(
    "registered user email matches",
    registeredUser.email,
    initialEmail,
  );
  TestValidator.equals(
    "registered user status is active",
    registeredUser.status,
    "active",
  );
  typia.assert(registeredUser.token);

  // Store the initial access token
  const initialAccessToken = registeredUser.token.access;

  // Step 2: Establish authenticated session (already done via registration)
  TestValidator.predicate(
    "initial access token is valid",
    initialAccessToken.length > 0,
  );

  // Step 3: Change password with correct current password
  const newPassword = "NewPassword456"; // New password different from old
  const passwordChangeResponse: ITodoAppUser.IPasswordChanged =
    await api.functional.todoApp.user.auth.change_password.changePassword(
      connection,
      {
        body: {
          current_password: initialPassword,
          new_password: newPassword,
        } satisfies ITodoAppUser.IChangePassword,
      },
    );
  typia.assert(passwordChangeResponse);

  // Step 4: Verify the password change response
  TestValidator.equals(
    "password change response user ID matches",
    passwordChangeResponse.id,
    registeredUser.id,
  );
  TestValidator.equals(
    "password change response email matches",
    passwordChangeResponse.email,
    registeredUser.email,
  );
  TestValidator.predicate(
    "password change confirmation message exists",
    passwordChangeResponse.message.length > 0,
  );

  // Step 5: Attempt to use the old access token - should fail with 401 Unauthorized
  // Create a connection with the old token to verify session invalidation
  const oldTokenConnection: api.IConnection = {
    ...connection,
    headers: {
      Authorization: `Bearer ${initialAccessToken}`,
    },
  };

  // Try to make an authenticated request with the old token
  // After password change, this should fail because the session was invalidated
  await TestValidator.error(
    "old session token should be rejected after password change",
    async () => {
      // Attempt to change password again using the old token
      // This will fail because the old token is no longer valid
      await api.functional.todoApp.user.auth.change_password.changePassword(
        oldTokenConnection,
        {
          body: {
            current_password: newPassword,
            new_password: "AnotherPassword789",
          } satisfies ITodoAppUser.IChangePassword,
        },
      );
    },
  );
}
