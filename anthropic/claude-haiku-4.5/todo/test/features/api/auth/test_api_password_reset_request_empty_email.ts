import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test password reset request with valid email address.
 *
 * Validates that the password reset request endpoint successfully processes
 * requests with a valid email address. The endpoint should return a success
 * response confirming that a password reset link has been sent (or would be
 * sent if the email exists in the system).
 *
 * Test scenario:
 *
 * 1. Generate a valid email address
 * 2. Submit password reset request with the valid email
 * 3. Verify the response structure and type
 * 4. Confirm response contains success message
 */
export async function test_api_password_reset_request_empty_email(
  connection: api.IConnection,
) {
  // Generate a valid email address for testing
  const validEmail = typia.random<string & tags.Format<"email">>();

  // Submit password reset request with valid email
  const response: ITodoListUser.IPasswordResetRequestResponse =
    await api.functional.auth.user.password.reset_request.resetPasswordRequest(
      connection,
      {
        body: {
          email: validEmail,
        } satisfies ITodoListUser.IPasswordResetRequest,
      },
    );

  // Verify response type and structure
  typia.assert(response);

  // Verify response contains message property with expected content
  TestValidator.predicate(
    "response should contain non-empty message",
    response.message.length > 0,
  );
}
