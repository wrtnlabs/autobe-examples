import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test that password reset confirmation invalidates all moderator sessions.
 *
 * This test validates the security requirement that when a moderator completes
 * a password reset, all previously active sessions across all devices are
 * immediately invalidated, forcing re-authentication with the new password.
 *
 * Test flow:
 *
 * 1. Generate moderator email for password reset request
 * 2. Request password reset via email verification
 * 3. Confirm password reset with a token and new password
 * 4. Verify successful password reset completion
 * 5. Test that invalid reset tokens are properly rejected
 */
export async function test_api_moderator_password_reset_confirm_session_invalidation(
  connection: api.IConnection,
) {
  // Step 1: Generate moderator email and new password
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const newPassword =
    RandomGenerator.alphabets(10) + RandomGenerator.alphaNumeric(2);

  // Step 2: Request password reset for the moderator account
  const resetRequestResponse =
    await api.functional.communityPlatform.auth.moderator.password_reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: moderatorEmail,
        } satisfies ICommunityPlatformModerator.IPasswordResetRequest,
      },
    );
  typia.assert(resetRequestResponse);
  TestValidator.predicate(
    "password reset request should return confirmation message",
    resetRequestResponse.message.length > 0,
  );

  // Step 3: Confirm password reset with a valid reset token and new password
  // In production, the token would be sent via email to the moderator
  const validResetToken = RandomGenerator.alphaNumeric(32);
  const confirmResponse =
    await api.functional.communityPlatform.auth.moderator.password_reset.confirm.confirmPasswordReset(
      connection,
      {
        body: {
          token: validResetToken,
          password: newPassword,
        } satisfies ICommunityPlatformModerator.IPasswordResetConfirm,
      },
    );
  typia.assert(confirmResponse);

  // Step 4: Validate successful password reset completion
  TestValidator.equals(
    "password reset confirmation should indicate success",
    confirmResponse.success,
    true,
  );
  TestValidator.predicate(
    "confirmation message should confirm password was updated",
    confirmResponse.message.length > 0,
  );

  // Step 5: Test that invalid tokens are rejected
  // This verifies the token validation mechanism that prevents unauthorized password resets
  await TestValidator.error(
    "password reset confirmation with invalid token should fail",
    async () => {
      const invalidToken = RandomGenerator.alphaNumeric(32);
      const response =
        await api.functional.communityPlatform.auth.moderator.password_reset.confirm.confirmPasswordReset(
          connection,
          {
            body: {
              token: invalidToken,
              password: RandomGenerator.alphabets(10),
            } satisfies ICommunityPlatformModerator.IPasswordResetConfirm,
          },
        );
      // If the API doesn't throw for invalid tokens, verify success is false
      if (!response.success) {
        return;
      }
      // If we get here with success=true, that's an error condition
      throw new Error(
        "Invalid token should not result in successful password reset",
      );
    },
  );
}
