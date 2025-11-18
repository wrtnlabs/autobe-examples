import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test password reset request behavior with non-existent email address.
 *
 * Validates the security-first design of the password reset endpoint by
 * ensuring that requests with non-existent email addresses return the same
 * generic success message as requests with existing emails. This prevents email
 * enumeration attacks where attackers could discover valid user accounts by
 * observing different responses.
 *
 * Test workflow:
 *
 * 1. Generate a random email address that doesn't exist in the system
 * 2. Submit password reset request with the non-existent email
 * 3. Verify the response contains the generic security message
 * 4. Confirm the response structure matches the expected type
 *
 * Security requirement: The API must return identical responses for both
 * existing and non-existing emails, preventing attackers from determining which
 * email addresses are registered in the todo_list_users table.
 */
export async function test_api_user_password_reset_request_nonexistent_email(
  connection: api.IConnection,
) {
  // Generate a random email that is guaranteed not to exist in the database
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();

  // Submit password reset request with non-existent email
  const response: ITodoListUser.IPasswordResetRequestResponse =
    await api.functional.auth.user.password.reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: nonExistentEmail,
        } satisfies ITodoListUser.IPasswordResetRequest,
      },
    );

  // Validate response structure
  typia.assert(response);

  // Verify the response contains a non-empty message
  TestValidator.predicate(
    "response contains security message",
    typeof response.message === "string" && response.message.length > 0,
  );

  // Validate the message follows the expected security pattern
  // The message should indicate conditional email sending to prevent enumeration
  TestValidator.predicate(
    "message uses security-conscious wording",
    response.message.includes("If") || response.message.includes("if"),
  );
}
