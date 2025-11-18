import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test the password reset request endpoint for a registered user email.
 *
 * 1. Generate a random, valid email address.
 * 2. (Assume user exists in DB for test purposes; if not, result is safe to show
 *    privacy masking)
 * 3. Send POST request to /auth/user/password/request-reset with the email in
 *    body.
 * 4. Confirm that response is of shape { success: boolean, message: string } and
 *    matches ITodoListUser.IPasswordResetStatus schema.
 * 5. Assert that success is true for known-good (registered) email, and the
 *    message is a nonempty string explaining next steps to user.
 * 6. Never expose whether account exists in system in response payload (privacy
 *    compliance, but in e2e for registered, success is expected).
 */
export async function test_api_password_reset_request_with_registered_email(
  connection: api.IConnection,
) {
  // 1. Generate a valid, random email for password reset (simulate registered user)
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const requestBody = { email } satisfies ITodoListUser.IRequestPasswordReset;

  // 2. Send the password reset request
  const response: ITodoListUser.IPasswordResetStatus =
    await api.functional.auth.user.password.request_reset.requestPasswordReset(
      connection,
      { body: requestBody },
    );
  typia.assert(response);

  // 3. Validate response fields
  TestValidator.predicate(
    "reset status should be success for registered email",
    response.success === true,
  );
  TestValidator.predicate(
    "status message should be a nonempty string",
    typeof response.message === "string" && response.message.length > 0,
  );
}
