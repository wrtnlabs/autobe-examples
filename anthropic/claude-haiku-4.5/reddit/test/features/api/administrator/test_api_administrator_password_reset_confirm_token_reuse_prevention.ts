import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";

/**
 * Test that a reset token cannot be reused after successful password reset
 * confirmation.
 *
 * This test verifies the security mechanism that prevents token reuse:
 *
 * 1. Request a password reset to obtain a valid reset token
 * 2. Use the token to successfully confirm a password reset with a new password
 * 3. Attempt to reuse the same token for another password reset
 * 4. Verify that the second attempt with the already-used token is rejected
 */
export async function test_api_administrator_password_reset_confirm_token_reuse_prevention(
  connection: api.IConnection,
) {
  // Step 1: Request a password reset to obtain a reset token
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const resetRequestResponse =
    await api.functional.communityPlatform.auth.administrator.password_reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: adminEmail,
        } satisfies ICommunityPlatformAdministrator.IPasswordResetRequest,
      },
    );
  typia.assert(resetRequestResponse);
  TestValidator.predicate(
    "password reset request returns success message",
    typeof resetRequestResponse.message === "string" &&
      resetRequestResponse.message.length > 0,
  );

  // Step 2: Generate a token for testing (in real scenario, this would come from email)
  // For testing purposes, we'll use a properly formatted reset token
  const resetToken = typia.random<string & tags.Format<"uuid">>();
  const newPassword = RandomGenerator.alphabets(12);

  // Step 3: First confirmation - should succeed
  const firstConfirmResponse =
    await api.functional.communityPlatform.auth.administrator.password_reset.confirm.confirmPasswordReset(
      connection,
      {
        body: {
          reset_token: resetToken,
          new_password: newPassword,
        } satisfies ICommunityPlatformAdministrator.IPasswordResetConfirm,
      },
    );
  typia.assert(firstConfirmResponse);
  TestValidator.predicate(
    "first password reset confirmation succeeds",
    firstConfirmResponse.success === true,
  );
  TestValidator.predicate(
    "confirmed response contains administrator id",
    typeof firstConfirmResponse.id === "string" &&
      firstConfirmResponse.id.length > 0,
  );
  TestValidator.equals(
    "confirmed response email matches request email",
    firstConfirmResponse.email,
    adminEmail,
  );

  // Step 4: Second confirmation attempt with the same token - should fail
  const secondNewPassword = RandomGenerator.alphabets(12);
  await TestValidator.error(
    "reusing the same reset token should fail",
    async () => {
      await api.functional.communityPlatform.auth.administrator.password_reset.confirm.confirmPasswordReset(
        connection,
        {
          body: {
            reset_token: resetToken,
            new_password: secondNewPassword,
          } satisfies ICommunityPlatformAdministrator.IPasswordResetConfirm,
        },
      );
    },
  );
}
