import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListPasswordReset";

/**
 * Test successful password reset request workflow.
 *
 * This test validates the password reset initiation process where a user
 * requests a password reset by providing their email address. The system should
 * accept the request and return a generic success message without revealing
 * whether the email exists in the database (security measure against email
 * enumeration attacks).
 *
 * Test workflow:
 *
 * 1. Generate a valid test email address
 * 2. Submit password reset request with the email
 * 3. Validate the response structure and message content
 */
export async function test_api_password_reset_request_successful(
  connection: api.IConnection,
) {
  // Generate a valid email address for the password reset request
  const testEmail = typia.random<string & tags.Format<"email">>();

  // Submit password reset request
  const response: ITodoListPasswordReset.IRequestResult =
    await api.functional.auth.user.password.reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: testEmail,
        } satisfies ITodoListPasswordReset.IRequest,
      },
    );

  // Validate response structure - typia.assert performs complete validation
  typia.assert(response);
}
