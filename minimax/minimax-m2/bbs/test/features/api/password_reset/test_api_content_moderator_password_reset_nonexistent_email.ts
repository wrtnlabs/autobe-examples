import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionContentModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionContentModerator";

/**
 * Test password reset request with non-existent email address for content
 * moderators.
 *
 * Validates that appropriate error handling occurs when attempting password
 * reset for accounts that don't exist in the system. Ensures secure response
 * without revealing account existence.
 *
 * This test checks security behavior to prevent account enumeration attacks by
 * ensuring the system handles non-existent email addresses gracefully without
 * leaking information about account existence.
 */
export async function test_api_content_moderator_password_reset_nonexistent_email(
  connection: api.IConnection,
) {
  // Generate a random email address that doesn't exist in the system
  const nonExistentEmail: string = typia.random<
    string & tags.Format<"email">
  >();

  // Attempt password reset with the non-existent email
  const passwordResetRequest = {
    email: nonExistentEmail,
  } satisfies IEconPoliticalDiscussionContentModerator.IResetPassword;

  // Call the password reset endpoint - this should handle non-existent emails gracefully
  const resetResponse =
    await api.functional.auth.contentModerator.password.reset.resetPassword(
      connection,
      {
        body: passwordResetRequest,
      },
    );

  // Validate the response structure and behavior
  typia.assert(resetResponse);

  // Verify the response contains appropriate information about the password reset process
  TestValidator.equals(
    "response contains message",
    resetResponse.message !== undefined && resetResponse.message.length > 0,
    true,
  );
  TestValidator.equals(
    "response contains next_steps",
    resetResponse.next_steps !== undefined &&
      resetResponse.next_steps.length > 0,
    true,
  );
  TestValidator.equals(
    "response contains email_sent status",
    typeof resetResponse.email_sent === "boolean",
    true,
  );

  // The email_sent flag should indicate whether the reset email was actually sent
  // For security reasons, the system may either:
  // 1. Always return true (without actually sending) to avoid revealing account existence
  // 2. Return false if the email doesn't exist (though this can be a security concern)
  // Either behavior is acceptable as long as no sensitive information is leaked

  // Additional validation to ensure no error information is exposed
  TestValidator.predicate(
    "no error details in message",
    !resetResponse.message.toLowerCase().includes("not found") &&
      !resetResponse.message.toLowerCase().includes("does not exist"),
  );
  TestValidator.predicate(
    "no email-specific information leaked",
    !resetResponse.message.includes(nonExistentEmail),
  );
}
