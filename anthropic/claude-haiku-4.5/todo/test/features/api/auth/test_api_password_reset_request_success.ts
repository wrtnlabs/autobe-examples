import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test successful password reset request initiation.
 *
 * This test validates that the password reset request endpoint properly handles
 * a valid email address and returns a success response. The endpoint:
 *
 * 1. Receives an email address for password reset
 * 2. Returns a generic success message (preventing email enumeration attacks)
 * 3. Would generate a secure reset token if a matching active user exists
 * 4. Would send the reset link via email to the registered address
 *
 * The response is identical regardless of whether the email exists in the
 * system, making it impossible for attackers to enumerate valid email
 * addresses.
 */
export async function test_api_password_reset_request_success(
  connection: api.IConnection,
) {
  // Generate a valid email address for the password reset request
  const testEmail = typia.random<string & tags.Format<"email">>();

  // Submit password reset request with valid email address
  const response =
    await api.functional.auth.user.password.reset_request.resetPasswordRequest(
      connection,
      {
        body: {
          email: testEmail,
        } satisfies ITodoListUser.IPasswordResetRequest,
      },
    );

  // Validate the response matches the expected type structure
  typia.assert(response);

  // Verify response contains a message confirming reset link was sent
  TestValidator.predicate(
    "response should contain a message property",
    response.message !== undefined && typeof response.message === "string",
  );

  // Verify the message is non-empty
  TestValidator.predicate(
    "message should be a non-empty string",
    response.message.length > 0,
  );
}
