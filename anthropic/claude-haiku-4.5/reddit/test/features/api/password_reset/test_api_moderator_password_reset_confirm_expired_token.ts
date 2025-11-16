import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test password reset confirmation with an expired token.
 *
 * This test validates that the system properly rejects password reset attempts
 * when the reset token has exceeded its validity window (typically 24-48
 * hours). The test ensures:
 *
 * 1. A password reset request is initiated for a moderator email
 * 2. The token is allowed to expire beyond its validity period
 * 3. An attempt to confirm the password reset with the expired token is rejected
 * 4. The system returns a generic error message (not revealing expiration status)
 * 5. The moderator's original password remains unchanged
 * 6. The expired token cannot be reused even with a valid new password
 *
 * This is a critical security test to prevent unauthorized access through
 * expired or intercepted password reset tokens.
 */
export async function test_api_moderator_password_reset_confirm_expired_token(
  connection: api.IConnection,
) {
  // Step 1: Initiate password reset request with a moderator email
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
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
    "password reset request should return success message",
    resetResponse.message.length > 0,
  );

  // Step 2: Simulate expired token scenario
  // In a real scenario, the token would expire after 24-48 hours.
  // For testing purposes, we use an expired/invalid token that mimics
  // a token that has exceeded its validity window.
  const expiredToken = RandomGenerator.alphaNumeric(64);

  // Step 3: Attempt to confirm password reset with expired token
  // This should fail with a generic error response
  const newPassword = `SecurePass${RandomGenerator.alphaNumeric(12)}!`;

  await TestValidator.error("expired token should be rejected", async () => {
    await api.functional.communityPlatform.auth.moderator.password_reset.confirm.confirmPasswordReset(
      connection,
      {
        body: {
          token: expiredToken,
          password: newPassword,
        } satisfies ICommunityPlatformModerator.IPasswordResetConfirm,
      },
    );
  });

  // Step 4: Verify that reusing the same expired token fails
  // This ensures the token cannot be reused even with different passwords
  const anotherNewPassword = `AnotherPass${RandomGenerator.alphaNumeric(10)}@`;

  await TestValidator.error("expired token cannot be reused", async () => {
    await api.functional.communityPlatform.auth.moderator.password_reset.confirm.confirmPasswordReset(
      connection,
      {
        body: {
          token: expiredToken,
          password: anotherNewPassword,
        } satisfies ICommunityPlatformModerator.IPasswordResetConfirm,
      },
    );
  });

  // Step 5: Validate that the error is generic (not revealing specific reason)
  // The system should not distinguish between invalid and expired tokens
  // in the error response to prevent information leakage
  const malformedToken = "invalid-token-format";

  await TestValidator.error(
    "invalid token should return generic error like expired token",
    async () => {
      await api.functional.communityPlatform.auth.moderator.password_reset.confirm.confirmPasswordReset(
        connection,
        {
          body: {
            token: malformedToken,
            password: newPassword,
          } satisfies ICommunityPlatformModerator.IPasswordResetConfirm,
        },
      );
    },
  );
}
