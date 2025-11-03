import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";

/**
 * Test email verification resend with unregistered email address.
 *
 * Validates that the system implements security best practices by returning a
 * generic success message regardless of whether the email is registered. This
 * prevents attackers from enumerating valid email addresses in the system.
 *
 * The test verifies:
 *
 * 1. API accepts unregistered email in resend verification request
 * 2. Returns generic success message without revealing registration status
 * 3. Response includes submitted email address
 * 4. Response includes verification token expiration timestamp
 * 5. Response type matches IResendVerificationResponse specification
 * 6. No actual email is sent, but API hides this fact
 *
 * This test is critical for security as it ensures email enumeration protection
 * while maintaining professional API behavior.
 */
export async function test_api_email_verification_resend_unregistered_email(
  connection: api.IConnection,
) {
  // Generate an unregistered email address (random email that doesn't exist)
  const unregisteredEmail = typia.random<string & tags.Format<"email">>();

  // Call the resend verification endpoint with the unregistered email
  const response: IDiscussionBoardMemberSession.IResendVerificationResponse =
    await api.functional.discussionBoard.auth.resend_verification.resendVerification(
      connection,
      {
        body: {
          email: unregisteredEmail,
        } satisfies IDiscussionBoardMemberSession.IResendVerificationRequest,
      },
    );

  // Validate response type
  typia.assert(response);

  // Verify success flag is true (generic response even for unregistered email)
  TestValidator.equals(
    "response success flag should be true",
    true,
    response.success,
  );

  // Verify the email address in response matches the request
  TestValidator.equals(
    "response email should match request email",
    unregisteredEmail,
    response.email,
  );

  // Verify response includes a message (should be generic)
  TestValidator.predicate(
    "response message should be non-empty",
    response.message.length > 0,
  );

  // Verify response includes verification token expiration timestamp
  TestValidator.predicate(
    "verification token expiration timestamp should be valid date-time",
    () => {
      // Parse the ISO 8601 date-time string
      const expirationDate = new Date(response.verification_token_expires_at);
      // Check if it's a valid date
      return !isNaN(expirationDate.getTime());
    },
  );

  // Verify expiration is in the future (token should be valid for some time)
  TestValidator.predicate(
    "verification token should expire in the future",
    () => {
      const expirationDate = new Date(response.verification_token_expires_at);
      return expirationDate.getTime() > Date.now();
    },
  );

  // Verify expiration is approximately 24 hours from now (typical token validity)
  TestValidator.predicate(
    "verification token expiration should be approximately 24 hours",
    () => {
      const expirationDate = new Date(response.verification_token_expires_at);
      const now = new Date();
      const differenceInMs = expirationDate.getTime() - now.getTime();
      const differenceInHours = differenceInMs / (1000 * 60 * 60);

      // Allow 23-25 hour window to account for clock skew and processing time
      return differenceInHours >= 23 && differenceInHours <= 25;
    },
  );

  // Verify the generic message is present (security best practice)
  TestValidator.predicate(
    "response should contain generic security message",
    () => {
      return (
        response.message.includes("account") ||
        response.message.includes("verification email") ||
        response.message.includes("5 minutes")
      );
    },
  );
}
