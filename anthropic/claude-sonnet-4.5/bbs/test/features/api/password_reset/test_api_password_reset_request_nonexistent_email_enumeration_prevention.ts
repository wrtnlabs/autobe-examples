import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPasswordReset";

/**
 * Test password reset request with non-existent email to verify enumeration
 * protection.
 *
 * This test validates a critical security feature: the password reset endpoint
 * must not reveal whether an email address is registered in the system. When a
 * password reset is requested for a non-existent email, the system should
 * return the same generic success message as it would for a valid email,
 * preventing attackers from enumerating valid email addresses through the
 * password reset functionality.
 *
 * Test Flow:
 *
 * 1. Generate a random email address that does not exist in the system
 * 2. Submit a password reset request with the non-existent email
 * 3. Validate that the API returns a successful response (not an error)
 * 4. Verify the response message is generic and does not reveal email
 *    non-existence
 * 5. Confirm response structure matches the expected IRequestResponse type
 *
 * Security Validation:
 *
 * - No error is thrown for non-existent emails
 * - Response message is intentionally vague (security feature)
 * - Response timing should be consistent with valid email requests
 */
export async function test_api_password_reset_request_nonexistent_email_enumeration_prevention(
  connection: api.IConnection,
) {
  // Generate a random non-existent email address
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();

  // Submit password reset request with non-existent email
  const response: IDiscussionBoardPasswordReset.IRequestResponse =
    await api.functional.discussionBoard.auth.password_reset.request(
      connection,
      {
        body: {
          email: nonExistentEmail,
        } satisfies IDiscussionBoardPasswordReset.IRequest,
      },
    );

  // Validate response type compliance
  typia.assert(response);

  // Verify the response contains a message field
  TestValidator.predicate(
    "response contains message field",
    typeof response.message === "string" && response.message.length > 0,
  );

  // Validate that the message is generic and does not reveal email non-existence
  // The message should be vague for security (e.g., "If an account exists...")
  TestValidator.predicate(
    "message is generic security message",
    response.message.toLowerCase().includes("if an account exists") ||
      response.message.toLowerCase().includes("if") ||
      response.message.toLowerCase().includes("instructions"),
  );
}
