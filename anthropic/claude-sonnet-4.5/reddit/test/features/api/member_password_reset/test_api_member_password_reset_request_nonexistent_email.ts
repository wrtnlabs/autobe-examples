import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";

/**
 * Test password reset request with non-existent email to verify security
 * against enumeration attacks.
 *
 * This test validates that the password reset request endpoint properly handles
 * requests for email addresses that don't exist in the system. The key security
 * requirement is that the response should be identical to valid email requests,
 * preventing attackers from determining which email addresses are registered.
 *
 * Test Flow:
 *
 * 1. Generate a random email address that doesn't exist in the system
 * 2. Submit a password reset request for this non-existent email
 * 3. Verify that the API returns a generic success response
 * 4. Confirm the response format matches the expected security pattern
 *
 * Expected Behavior:
 *
 * - Returns success: true
 * - Provides a generic message that doesn't reveal if the email exists
 * - Response is indistinguishable from valid email requests
 */
export async function test_api_member_password_reset_request_nonexistent_email(
  connection: api.IConnection,
) {
  // Generate a random non-existent email address
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();

  // Submit password reset request for the non-existent email
  const response: IRedditLikeMember.IPasswordResetRequested =
    await api.functional.auth.member.password.reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: nonExistentEmail,
        } satisfies IRedditLikeMember.IRequestPasswordReset,
      },
    );

  // Validate the response structure
  typia.assert(response);

  // Verify that success is true (generic response regardless of email existence)
  TestValidator.equals(
    "response success should be true",
    response.success,
    true,
  );

  // Verify that a generic message is returned (should not reveal email existence)
  TestValidator.predicate(
    "response message should be a non-empty string",
    typeof response.message === "string" && response.message.length > 0,
  );

  // Verify the message is generic and doesn't reveal whether email exists
  TestValidator.predicate(
    "message should be generic to prevent enumeration",
    response.message.toLowerCase().includes("if") ||
      response.message.toLowerCase().includes("email"),
  );
}
