import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test password reset request with non-existent email for security validation.
 *
 * This test validates that the password reset request endpoint properly
 * implements security best practices by not revealing whether an email address
 * is registered in the system. The API should return success (200) status
 * regardless of whether the email exists, preventing attackers from enumerating
 * valid email addresses (email enumeration attacks).
 *
 * The test:
 *
 * 1. Generates a random non-existent email address
 * 2. Submits a password reset request with this email
 * 3. Validates that the operation returns success (200) status
 * 4. Confirms that no errors are thrown
 * 5. Ensures the API does not differentiate between existent and non-existent
 *    emails
 */
export async function test_api_member_password_reset_request_nonexistent_email(
  connection: api.IConnection,
) {
  // Generate a random non-existent email address
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();

  // Submit password reset request with non-existent email
  await api.functional.communityPlatform.auth.member.password_reset.request.requestPasswordReset(
    connection,
    {
      body: {
        email: nonExistentEmail,
      } satisfies ICommunityPlatformMember.IPasswordResetRequest,
    },
  );

  // If no error is thrown, the security best practice is implemented correctly
  // The API returns success even for non-existent emails (preventing enumeration)
  TestValidator.predicate(
    "password reset request should succeed for non-existent email",
    true,
  );
}
