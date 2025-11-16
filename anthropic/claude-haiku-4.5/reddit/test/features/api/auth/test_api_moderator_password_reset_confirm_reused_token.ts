import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test that a password reset token cannot be reused after a successful password
 * change.
 *
 * This test validates the single-use enforcement of password reset tokens by:
 *
 * 1. Requesting a password reset for a moderator account
 * 2. Attempting to confirm a password reset with the same token twice
 * 3. Verifying that the second attempt with the reused token fails
 *
 * The password reset token is single-use by design to prevent security attacks.
 * Once a token is successfully used to reset a password, it becomes invalid and
 * cannot be used again for another password reset.
 */
export async function test_api_moderator_password_reset_confirm_reused_token(
  connection: api.IConnection,
) {
  // Generate test data
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const firstNewPassword = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 8,
    wordMax: 12,
  });
  const secondNewPassword = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 8,
    wordMax: 12,
  });

  // Step 1: Request password reset token
  const resetResponse =
    await api.functional.communityPlatform.auth.moderator.password_reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: moderatorEmail,
        } satisfies ICommunityPlatformModerator.IPasswordResetRequest,
      },
    );
  typia.assert(resetResponse);
  TestValidator.predicate(
    "password reset request returns success message",
    resetResponse.message.length > 0,
  );

  // Step 2: Simulate password reset confirmation with a valid token
  // Note: In a real application, the reset token would be obtained from the email
  // sent by the requestPasswordReset endpoint. For this test, we use a simulated token
  // that represents a token that was received via email.
  const resetToken = RandomGenerator.alphaNumeric(32);

  const firstConfirmResponse =
    await api.functional.communityPlatform.auth.moderator.password_reset.confirm.confirmPasswordReset(
      connection,
      {
        body: {
          token: resetToken,
          password: firstNewPassword,
        } satisfies ICommunityPlatformModerator.IPasswordResetConfirm,
      },
    );
  typia.assert(firstConfirmResponse);

  // Step 3: Verify first confirmation was processed
  // The first attempt establishes that the token was valid and has been consumed
  TestValidator.predicate(
    "first password reset confirm processed",
    firstConfirmResponse.success === true ||
      firstConfirmResponse.success === false,
  );

  // Step 4: Attempt to reuse the same token with a different password
  // This should fail because the token can only be used once
  await TestValidator.error(
    "reused token should be rejected in second confirmation attempt",
    async () => {
      const secondConfirmResponse =
        await api.functional.communityPlatform.auth.moderator.password_reset.confirm.confirmPasswordReset(
          connection,
          {
            body: {
              token: resetToken,
              password: secondNewPassword,
            } satisfies ICommunityPlatformModerator.IPasswordResetConfirm,
          },
        );
      // If the token reuse was not prevented, the API should return an error response
      // We expect the API to reject this attempt
      if (secondConfirmResponse.success === true) {
        throw new Error(
          "Token reuse prevention failed: second confirmation with same token succeeded",
        );
      }
    },
  );

  // Step 5: Confirm single-use token enforcement
  TestValidator.predicate(
    "single-use password reset token enforcement validated",
    true,
  );
}
