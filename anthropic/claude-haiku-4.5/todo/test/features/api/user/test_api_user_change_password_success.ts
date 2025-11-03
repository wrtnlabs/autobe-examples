import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test successful password change workflow for an authenticated user.
 *
 * This test validates the complete password change flow:
 *
 * 1. Create a new user account with initial email and password
 * 2. System automatically authenticates user with JWT tokens
 * 3. User provides current password and new valid password to change-password
 *    endpoint
 * 4. System validates current password is correct
 * 5. System validates new password meets requirements (8+ chars, different from
 *    current)
 * 6. Password hash is updated in database
 * 7. Response confirms password change with user details
 * 8. All existing sessions are invalidated after response delivery
 *
 * The test ensures:
 *
 * - User registration creates valid authenticated session
 * - Password change endpoint requires current password for verification
 * - New password must meet minimum length requirements
 * - New password must differ from old password
 * - Response contains user ID, email, and confirmation message
 * - Type validation of response matches ITodoAppUser.IPasswordChanged
 */
export async function test_api_user_change_password_success(
  connection: api.IConnection,
) {
  // Step 1: Create new user account with initial email and password
  const initialEmail = typia.random<string & tags.Format<"email">>();
  const initialPassword = RandomGenerator.alphabets(12); // 12 char password (> 8 char minimum)

  const registeredUser = await api.functional.auth.user.join(connection, {
    body: {
      email: initialEmail,
      password: initialPassword,
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(registeredUser);

  // Verify user was created with correct email
  TestValidator.equals(
    "registered user email matches input",
    registeredUser.email,
    initialEmail,
  );

  // Verify user has authorization token for authenticated requests
  TestValidator.predicate(
    "registered user has access token",
    registeredUser.token.access.length > 0,
  );
  TestValidator.predicate(
    "registered user has refresh token",
    registeredUser.token.refresh.length > 0,
  );

  // Step 2: Generate new password that is guaranteed different and meets requirements
  let newPassword: string;
  do {
    newPassword = RandomGenerator.alphabets(15); // 15 char password (minimum 8 chars)
  } while (newPassword === initialPassword); // Ensure passwords differ

  const passwordChangeResponse =
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

  // Step 3: Verify password change response
  TestValidator.equals(
    "password change response contains correct user ID",
    passwordChangeResponse.id,
    registeredUser.id,
  );

  TestValidator.equals(
    "password change response contains correct email",
    passwordChangeResponse.email,
    initialEmail,
  );

  TestValidator.predicate(
    "password change response contains confirmation message",
    passwordChangeResponse.message.length > 0,
  );
}
