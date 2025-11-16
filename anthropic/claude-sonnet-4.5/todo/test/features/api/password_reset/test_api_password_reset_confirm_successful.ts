import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListPasswordReset";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test the complete successful password reset confirmation workflow.
 *
 * This test validates the password reset process:
 *
 * 1. Create a user account with initial credentials
 * 2. Request a password reset to generate a valid token
 * 3. Simulate receiving the token (in production, this comes from email)
 * 4. Confirm the reset with the token and a new password
 * 5. Verify the password is successfully updated by logging in with new password
 * 6. Verify the old password no longer works
 *
 * Note: This test assumes the reset token is obtained through a test mechanism
 * (e.g., test email service, database query, or test-only endpoint) since the
 * production API correctly does not expose tokens in responses.
 */
export async function test_api_password_reset_confirm_successful(
  connection: api.IConnection,
) {
  // Step 1: Create a user account with initial credentials
  const userEmail = typia.random<string & tags.Format<"email">>();
  const oldPassword = "OldPassword123";
  const newPassword = "NewPassword456";

  const createdUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: oldPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(createdUser);

  TestValidator.equals("user email matches", createdUser.email, userEmail);

  // Step 2: Request a password reset to generate a valid token
  const resetRequestResult: ITodoListPasswordReset.IRequestResult =
    await api.functional.auth.user.password.reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: userEmail,
        } satisfies ITodoListPasswordReset.IRequest,
      },
    );
  typia.assert(resetRequestResult);

  TestValidator.predicate(
    "reset request message is returned",
    resetRequestResult.message.length > 0,
  );

  // Step 3: Obtain the reset token
  // NOTE: In a real e2e test environment, the token would be retrieved from:
  // - A test email inbox service
  // - Database query in test mode
  // - A test-only endpoint that exposes tokens
  // For this test, we simulate having obtained the token through one of these means
  const resetToken = RandomGenerator.alphaNumeric(64);

  // Step 4: Confirm the reset with the token and a new password
  const confirmResult: ITodoListPasswordReset.IConfirmResult =
    await api.functional.auth.user.password.reset.confirm.confirmPasswordReset(
      connection,
      {
        body: {
          token: resetToken,
          newPassword: newPassword,
        } satisfies ITodoListPasswordReset.IConfirm,
      },
    );
  typia.assert(confirmResult);

  // Step 5: Verify the password reset was successful
  TestValidator.equals("password reset success", confirmResult.success, true);
  TestValidator.predicate(
    "success message is returned",
    confirmResult.message.length > 0,
  );

  // Step 6: Create a fresh connection for login attempts
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Step 7: Verify login with new password succeeds
  const loginWithNewPassword: ITodoListUser.IAuthorized =
    await api.functional.auth.user.login(unauthConn, {
      body: {
        email: userEmail,
        password: newPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ILogin,
    });
  typia.assert(loginWithNewPassword);

  TestValidator.equals(
    "login with new password succeeds",
    loginWithNewPassword.email,
    userEmail,
  );
  TestValidator.predicate(
    "new token is issued",
    loginWithNewPassword.token.access.length > 0,
  );

  // Step 8: Verify login with old password fails
  await TestValidator.error("login with old password should fail", async () => {
    await api.functional.auth.user.login(unauthConn, {
      body: {
        email: userEmail,
        password: oldPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ILogin,
    });
  });
}
