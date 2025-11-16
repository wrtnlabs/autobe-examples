import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

export async function test_api_moderator_password_reset_nonexistent_email(
  connection: api.IConnection,
) {
  /**
   * Test password reset request with a non-existent email address.
   *
   * This test verifies that the password reset endpoint implements proper email
   * enumeration attack prevention by returning a generic success response for
   * non-existent moderator emails. By not indicating whether an email exists in
   * the system, attackers cannot enumerate valid moderator email addresses.
   *
   * The endpoint returns the same generic success message regardless of whether
   * the email is associated with an active moderator account, following
   * security best practices for account enumeration prevention.
   */

  // Generate a non-existent email that is unlikely to be in the system
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();

  // Submit password reset request with non-existent email
  const response =
    await api.functional.communityPlatform.auth.moderator.password_reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: nonExistentEmail,
        } satisfies ICommunityPlatformModerator.IPasswordResetRequest,
      },
    );

  // Validate the response structure
  typia.assert(response);

  // Verify response contains a message field
  TestValidator.predicate(
    "password reset response should contain message field",
    response.message !== undefined && response.message !== null,
  );

  // Verify the message is a non-empty string (generic success message)
  TestValidator.predicate(
    "password reset response message should be a non-empty string",
    typeof response.message === "string" && response.message.length > 0,
  );

  // For security: verify the message is generic and doesn't reveal account information
  // The message should not indicate whether the email was found or not
  TestValidator.predicate(
    "response message should not contain account enumeration indicators",
    !response.message.toLowerCase().includes("not found") &&
      !response.message.toLowerCase().includes("does not exist") &&
      !response.message.toLowerCase().includes("not registered"),
  );
}
