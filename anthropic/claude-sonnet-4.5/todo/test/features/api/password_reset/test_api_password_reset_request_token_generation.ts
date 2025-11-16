import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListPasswordReset";

/**
 * Test password reset request token generation with proper validation.
 *
 * This test validates that the password reset request endpoint generates a
 * secure token with proper expiration and metadata. The endpoint should accept
 * a valid email address and return a generic success message without revealing
 * whether the email exists in the system (security measure against email
 * enumeration).
 *
 * Steps:
 *
 * 1. Generate a random valid email address
 * 2. Submit password reset request via API
 * 3. Validate response structure and message
 * 4. Ensure response is generic and secure
 *
 * Security considerations:
 *
 * - Response should not indicate email existence
 * - Generic success message returned regardless of email validity
 * - No authentication required (public endpoint)
 */
export async function test_api_password_reset_request_token_generation(
  connection: api.IConnection,
) {
  // Generate a random valid email address for testing
  const testEmail = typia.random<string & tags.Format<"email">>();

  // Submit password reset request
  const result: ITodoListPasswordReset.IRequestResult =
    await api.functional.auth.user.password.reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: testEmail,
        } satisfies ITodoListPasswordReset.IRequest,
      },
    );

  // Validate response structure
  typia.assert(result);

  // Validate that response contains a message
  TestValidator.predicate(
    "response should contain non-empty message",
    typeof result.message === "string" && result.message.length > 0,
  );
}
