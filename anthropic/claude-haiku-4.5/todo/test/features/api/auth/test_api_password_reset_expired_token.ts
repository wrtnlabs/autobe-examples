import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAuthPasswordResetRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthPasswordResetRequest";
import type { ITodoAppAuthPasswordResetResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthPasswordResetResponse";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test password reset completion with expired or invalid token.
 *
 * When a reset token is invalid or expired (exceeds the 1-hour expiration
 * window), the system should reject the reset attempt with an appropriate error
 * message instructing the user to request a new password reset, demonstrating
 * proper token lifecycle management and security validation.
 *
 * Process:
 *
 * 1. Create a new user account through registration
 * 2. Initiate password reset request for the user's email
 * 3. Attempt to complete password reset with an invalid/expired token
 * 4. Verify system rejects the attempt with appropriate error response
 * 5. Confirm user is instructed to request new password reset
 * 6. Validate error messaging and recovery action guidance
 */
export async function test_api_password_reset_expired_token(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account through registration
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "TestPassword123";

  const createdUser: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
      } satisfies ITodoAppUser.IJoin,
    });
  typia.assert(createdUser);
  TestValidator.predicate(
    "user account created successfully",
    createdUser.id !== undefined,
  );

  // Step 2: Initiate password reset request for the user's email
  const resetRequestResponse: ITodoAppAuthPasswordResetResponse =
    await api.functional.todoApp.auth.password_reset.resetPassword(connection, {
      body: {
        email: userEmail,
      } satisfies ITodoAppAuthPasswordResetRequest,
    });
  typia.assert(resetRequestResponse);
  TestValidator.equals(
    "password reset instructions sent to email",
    resetRequestResponse.success,
    true,
  );

  // Step 3: Attempt to complete password reset with an invalid/expired token
  // Simulate using an expired or invalid token by providing a random token
  // that doesn't correspond to any real reset token
  const invalidExpiredToken = RandomGenerator.alphaNumeric(128);
  const newPassword = "NewPassword123";

  const expiredTokenResponse: ITodoAppAuthPasswordResetResponse =
    await api.functional.todoApp.auth.password_reset.resetPassword(connection, {
      body: {
        reset_token: invalidExpiredToken,
        new_password: newPassword,
        confirm_password: newPassword,
      } satisfies ITodoAppAuthPasswordResetRequest,
    });
  typia.assert(expiredTokenResponse);

  // Step 4: Verify system rejects the attempt with appropriate error response
  TestValidator.equals(
    "expired/invalid token is rejected",
    expiredTokenResponse.success,
    false,
  );

  // Step 5 & 6: Validate error messaging and recovery action guidance
  TestValidator.predicate(
    "error message indicates token expiration or invalidity",
    expiredTokenResponse.message.includes("expired") ||
      expiredTokenResponse.message.includes("invalid") ||
      expiredTokenResponse.message.toLowerCase().includes("expired") ||
      expiredTokenResponse.message.toLowerCase().includes("invalid"),
  );

  TestValidator.equals(
    "recovery action directs user to request new password reset",
    expiredTokenResponse.recovery_action,
    "try_reset_password",
  );

  TestValidator.predicate(
    "status code indicates token validation error",
    expiredTokenResponse.status_code === "PASSWORD_RESET_TOKEN_EXPIRED" ||
      expiredTokenResponse.status_code === "PASSWORD_RESET_INVALID_TOKEN",
  );
}
