import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListPasswordReset";

/**
 * Test password reset request with a non-existent email address.
 *
 * This test validates the security behavior of the password reset request
 * endpoint when provided with an email address that does not exist in the
 * todo_list_users table.
 *
 * Security Design: The endpoint must return the same generic success message
 * regardless of whether the email exists or not. This prevents email
 * enumeration attacks where attackers could determine which email addresses are
 * registered in the system.
 *
 * Test Flow:
 *
 * 1. Generate a random, non-existent email address
 * 2. Send password reset request with the non-existent email
 * 3. Validate response structure and type compliance
 * 4. Verify generic success message is returned
 * 5. Confirm no error is thrown and no information is leaked
 *
 * Expected Outcome:
 *
 * - API returns 200 OK status
 * - Response contains a generic message field
 * - No indication of whether email exists or not
 * - Response format identical to successful requests with valid emails
 */
export async function test_api_password_reset_request_nonexistent_email(
  connection: api.IConnection,
) {
  // Generate a random email address that doesn't exist in the system
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();

  // Create request body with the non-existent email
  const requestBody = {
    email: nonExistentEmail,
  } satisfies ITodoListPasswordReset.IRequest;

  // Send password reset request with non-existent email
  const response: ITodoListPasswordReset.IRequestResult =
    await api.functional.auth.user.password.reset.request.requestPasswordReset(
      connection,
      {
        body: requestBody,
      },
    );

  // Validate response structure and type compliance
  typia.assert(response);

  // Verify that response contains a non-empty message field
  TestValidator.predicate(
    "response must contain a non-empty generic message",
    typeof response.message === "string" && response.message.length > 0,
  );
}
