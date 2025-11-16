import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test email verification send with non-existent email address.
 *
 * This test validates API behavior when requesting email verification for an
 * email address that is not registered in the system. For security purposes (to
 * prevent email enumeration attacks), the API returns a success response as if
 * the email were sent, without revealing whether the email exists.
 *
 * Validates that:
 *
 * 1. API accepts request with non-existent email
 * 2. Returns HTTP 200 success response
 * 3. Response indicates success (success: true)
 * 4. Response includes descriptive confirmation message
 * 5. Response matches IEmailVerifySendResponse type exactly
 *
 * Security context: Email enumeration prevention - attackers cannot discover
 * which emails are registered by observing API responses.
 */
export async function test_api_member_email_verification_send_nonexistent_email(
  connection: api.IConnection,
) {
  // Generate a random email address that does not exist in the system
  // Using a unique, non-existent email with proper format validation
  const nonExistentEmail = `test-nonexistent-${RandomGenerator.alphaNumeric(16)}@example.com`;

  // Send email verification request with non-existent email
  const response =
    await api.functional.communityPlatform.auth.member.email_verify.send.sendEmailVerification(
      connection,
      {
        body: {
          email: nonExistentEmail,
        } satisfies ICommunityPlatformMember.IEmailVerifySendRequest,
      },
    );

  // Validate response type matches IEmailVerifySendResponse
  typia.assert(response);

  // Verify response indicates success
  TestValidator.predicate(
    "response success flag should be true for security (email enumeration prevention)",
    response.success === true,
  );

  // Verify response has a message
  TestValidator.predicate(
    "response should contain a descriptive message",
    typeof response.message === "string" && response.message.length > 0,
  );

  // Verify response structure is consistent with security requirement
  // (same response whether email exists or not)
  TestValidator.equals(
    "response should be of expected type with success and message properties",
    true,
    response.success !== undefined && response.message !== undefined,
  );
}
