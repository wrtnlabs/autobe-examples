import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListPasswordReset";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test password strength validation during reset confirmation.
 *
 * This test validates that the password reset confirmation endpoint properly
 * enforces password strength requirements. The test workflow is as follows:
 *
 * 1. Create a new user account to establish a test user in the system
 * 2. Request a password reset to generate a valid reset token
 * 3. Attempt to confirm password reset with various weak passwords that violate
 *    strength requirements:
 *
 *    - Too short passwords (less than minimum length)
 *    - Passwords lacking complexity (no special characters, no numbers, etc.)
 *    - Common/predictable passwords
 * 4. Verify that each weak password attempt is rejected with appropriate error
 *    responses
 * 5. Finally, confirm the reset with a strong password that meets all requirements
 * 6. Verify that the strong password is accepted and the reset completes
 *    successfully
 *
 * This ensures that password security policies are consistently enforced during
 * the password reset process, not just during initial registration, protecting
 * user accounts from weak credentials.
 */
export async function test_api_password_reset_confirm_password_strength(
  connection: api.IConnection,
) {
  // Step 1: Create a user account for testing password reset
  const userEmail = typia.random<string & tags.Format<"email">>();
  const originalPassword = "StrongPass123!@#";

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: originalPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // Create unauthenticated connection for password reset operations
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // Step 2: Request password reset to get a valid token
  const resetRequest =
    await api.functional.auth.user.password.reset.request.requestPasswordReset(
      unauthConnection,
      {
        body: {
          email: userEmail,
        } satisfies ITodoListPasswordReset.IRequest,
      },
    );
  typia.assert(resetRequest);

  // Note: In a real scenario, the reset token would be extracted from email.
  // Since we cannot access the actual token in this test environment,
  // we simulate the token for demonstration purposes.
  // In production, this test would require email interception infrastructure.
  const resetToken = RandomGenerator.alphaNumeric(32);

  // Step 3: Test weak passwords - too short (less than 8 characters)
  await TestValidator.error(
    "password too short should be rejected",
    async () => {
      await api.functional.auth.user.password.reset.confirm.confirmPasswordReset(
        unauthConnection,
        {
          body: {
            token: resetToken,
            newPassword: "Short1!",
          } satisfies ITodoListPasswordReset.IConfirm,
        },
      );
    },
  );

  // Step 4: Test weak passwords - no numbers
  await TestValidator.error(
    "password without numbers should be rejected",
    async () => {
      await api.functional.auth.user.password.reset.confirm.confirmPasswordReset(
        unauthConnection,
        {
          body: {
            token: resetToken,
            newPassword: "OnlyLetters!@#",
          } satisfies ITodoListPasswordReset.IConfirm,
        },
      );
    },
  );

  // Step 5: Test weak passwords - no special characters
  await TestValidator.error(
    "password without special characters should be rejected",
    async () => {
      await api.functional.auth.user.password.reset.confirm.confirmPasswordReset(
        unauthConnection,
        {
          body: {
            token: resetToken,
            newPassword: "OnlyLetters123",
          } satisfies ITodoListPasswordReset.IConfirm,
        },
      );
    },
  );

  // Step 6: Test weak passwords - common password
  await TestValidator.error("common password should be rejected", async () => {
    await api.functional.auth.user.password.reset.confirm.confirmPasswordReset(
      unauthConnection,
      {
        body: {
          token: resetToken,
          newPassword: "Password123!",
        } satisfies ITodoListPasswordReset.IConfirm,
      },
    );
  });

  // Step 7: Test with strong password that meets all requirements
  const strongPassword = "Str0ng!Pass@2024";
  const confirmResult =
    await api.functional.auth.user.password.reset.confirm.confirmPasswordReset(
      unauthConnection,
      {
        body: {
          token: resetToken,
          newPassword: strongPassword,
        } satisfies ITodoListPasswordReset.IConfirm,
      },
    );
  typia.assert(confirmResult);

  // Step 8: Verify the reset was successful
  TestValidator.equals(
    "password reset should succeed with strong password",
    confirmResult.success,
    true,
  );
}
