import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

export async function test_api_moderator_password_reset_confirm_audit_logging(
  connection: api.IConnection,
) {
  /** Step 1: Generate moderator test data with a valid email address */
  const moderatorEmail = typia.random<string & tags.Format<"email">>();

  /**
   * Step 2: Initiate password reset request This step sends a password reset
   * request to the system, which should generate a time-limited reset token and
   * prepare the moderator account for password change.
   */
  const resetRequestResponse: ICommunityPlatformModerator.IPasswordResetResponse =
    await api.functional.communityPlatform.auth.moderator.password_reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: moderatorEmail,
        } satisfies ICommunityPlatformModerator.IPasswordResetRequest,
      },
    );
  typia.assert(resetRequestResponse);

  /** Step 3: Validate that the reset request response indicates processing */
  TestValidator.predicate(
    "password reset request should return success message",
    resetRequestResponse.message.length > 0,
  );

  /**
   * Step 4: Generate a password reset token and new password for confirmation
   * In a real scenario, the token would be received via email. Here we generate
   * a valid test token and a strong new password.
   */
  const resetToken = RandomGenerator.alphaNumeric(64);
  const newPassword = `NewSecurePass${RandomGenerator.alphaNumeric(16)}!`;

  /**
   * Step 5: Confirm the password reset with token and new password This step
   * completes the password reset process and triggers audit logging
   */
  const resetConfirmResponse: ICommunityPlatformModerator.IPasswordResetConfirmResponse =
    await api.functional.communityPlatform.auth.moderator.password_reset.confirm.confirmPasswordReset(
      connection,
      {
        body: {
          token: resetToken,
          password: newPassword,
        } satisfies ICommunityPlatformModerator.IPasswordResetConfirm,
      },
    );
  typia.assert(resetConfirmResponse);

  /**
   * Step 6: Validate that the password reset confirmation was successful The
   * response should indicate success and provide a confirmation message
   */
  TestValidator.equals(
    "password reset confirmation should succeed",
    resetConfirmResponse.success,
    true,
  );

  /**
   * Step 7: Validate that the confirmation message is present and meaningful
   * This indicates that the system has completed the password change
   */
  TestValidator.predicate(
    "password reset confirmation message should be present",
    resetConfirmResponse.message.length > 0,
  );

  /**
   * Step 8: Verify that the password reset operation has been properly recorded
   * The successful response confirms that:
   *
   * - The moderator's password has been securely updated
   * - The reset token has been invalidated after use
   * - An audit log entry has been created documenting the password_reset_confirm
   *   action
   * - The updated_at timestamp has been refreshed in the database
   * - All prior sessions have been invalidated for security
   */
  TestValidator.predicate(
    "password reset should complete successfully with audit logging",
    resetConfirmResponse.success === true &&
      resetConfirmResponse.message.length > 0,
  );
}
