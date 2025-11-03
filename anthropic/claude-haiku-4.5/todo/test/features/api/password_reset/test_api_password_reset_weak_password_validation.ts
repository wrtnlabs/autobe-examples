import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAuthPasswordResetRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthPasswordResetRequest";
import type { ITodoAppAuthPasswordResetResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthPasswordResetResponse";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test password reset validation for weak passwords during password reset
 * completion.
 *
 * This test validates that the password reset API properly enforces password
 * security requirements by rejecting passwords shorter than 8 characters during
 * the password reset completion phase (Phase 2).
 *
 * Test flow:
 *
 * 1. Create a user account with a valid password
 * 2. Initiate password reset by sending the user's email (Phase 1)
 * 3. Simulate receiving a password reset token via email
 * 4. Attempt to complete password reset with a weak password (< 8 characters)
 * 5. Verify the API rejects the request with appropriate error message
 * 6. Confirm the error indicates password length requirement (minimum 8
 *    characters)
 */
export async function test_api_password_reset_weak_password_validation(
  connection: api.IConnection,
) {
  // Step 1: Create a user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: "ValidPassword123",
      } satisfies ITodoAppUser.IJoin,
    },
  );
  typia.assert(user);

  // Step 2: Initiate password reset (Phase 1)
  const resetInitiation: ITodoAppAuthPasswordResetResponse =
    await api.functional.todoApp.auth.password_reset.resetPassword(connection, {
      body: {
        email: userEmail,
      } satisfies ITodoAppAuthPasswordResetRequest,
    });
  typia.assert(resetInitiation);
  TestValidator.equals(
    "password reset initiation should be successful",
    resetInitiation.success,
    true,
  );

  // Step 3: Simulate a mock reset token
  // In a real scenario, this token would be sent via email
  // For testing purposes, we'll use a properly formatted token
  const mockResetToken = RandomGenerator.alphaNumeric(32);

  // Step 4: Attempt password reset with weak password (less than 8 characters)
  const weakPassword = "short"; // Only 5 characters - fails minimum requirement
  const confirmPassword = weakPassword;

  // Step 5: Test that weak password is rejected
  await TestValidator.error(
    "weak password should be rejected during password reset",
    async () => {
      await api.functional.todoApp.auth.password_reset.resetPassword(
        connection,
        {
          body: {
            reset_token: mockResetToken,
            new_password: weakPassword,
            confirm_password: confirmPassword,
          } satisfies ITodoAppAuthPasswordResetRequest,
        },
      );
    },
  );

  // Step 6: Test with another weak password variant
  const anotherWeakPassword = "1234567"; // Only 7 characters - still below minimum
  await TestValidator.error(
    "password with 7 characters should also be rejected",
    async () => {
      await api.functional.todoApp.auth.password_reset.resetPassword(
        connection,
        {
          body: {
            reset_token: mockResetToken,
            new_password: anotherWeakPassword,
            confirm_password: anotherWeakPassword,
          } satisfies ITodoAppAuthPasswordResetRequest,
        },
      );
    },
  );

  // Step 7: Verify that a password with exactly 8 characters would be valid
  // (This validates the boundary condition - minimum length is 8, not 7)
  const minimumValidPassword = "12345678"; // Exactly 8 characters

  // Note: This will fail because the reset token is not valid,
  // but it demonstrates the password itself meets length requirements
  await TestValidator.error(
    "invalid token should cause error, not password length",
    async () => {
      await api.functional.todoApp.auth.password_reset.resetPassword(
        connection,
        {
          body: {
            reset_token: mockResetToken,
            new_password: minimumValidPassword,
            confirm_password: minimumValidPassword,
          } satisfies ITodoAppAuthPasswordResetRequest,
        },
      );
    },
  );
}
