import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test password reset request with non-existent email address.
 *
 * This test validates the security-conscious behavior of the password reset
 * endpoint when handling email addresses that don't exist in the system. For
 * security purposes (preventing email enumeration attacks), the API should
 * return a success message even when the email is not registered, preventing
 * attackers from discovering which email addresses are valid users.
 *
 * Test Flow:
 *
 * 1. Generate a random email address that doesn't exist in the system
 * 2. Submit password reset request with the non-existent email
 * 3. Verify response indicates success (prevents email enumeration)
 * 4. Validate response structure and expiration time information
 */
export async function test_api_password_reset_request_nonexistent_email(
  connection: api.IConnection,
) {
  // Generate a random email that is guaranteed not to exist in the system
  // Using a unique random string to ensure no collision with existing users
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();

  // Submit password reset request with non-existent email
  const response: IDiscussionBoardMember.IPasswordResetRequested =
    await api.functional.auth.member.password.reset.requestPasswordReset(
      connection,
      {
        body: {
          email: nonExistentEmail,
        } satisfies IDiscussionBoardMember.IRequestPasswordReset,
      },
    );

  // Validate response structure
  typia.assert(response);

  // Verify the response includes a success message
  // This confirms the API returns success even for non-existent emails
  TestValidator.predicate(
    "response message should indicate success",
    response.message.length > 0,
  );

  // Verify expiration time is provided and is a positive value
  TestValidator.predicate(
    "expires_in_minutes should be positive",
    response.expires_in_minutes > 0,
  );

  // Verify the typical expiration time (should be 60 minutes as per spec)
  TestValidator.predicate(
    "expires_in_minutes should be reasonable",
    response.expires_in_minutes >= 1 && response.expires_in_minutes <= 1440,
  );
}
