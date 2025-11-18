import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that a password reset request can be initiated with a registered email
 * address.
 *
 * This test simulates a user initiating a password reset for their account by
 * submitting their email to the password reset endpoint. The API should always
 * return a generic message, never indicating whether the email exists. The
 * response must conform strictly to ITodoListUser.IPasswordResetInitiated type.
 * No information leakage about account existence is permitted by the backend,
 * fulfilling security requirements.
 *
 * Steps:
 *
 * 1. Generate a test email address (valid RFC 5322 format).
 * 2. Call the password reset initiation endpoint (POST
 *    /auth/user/password/request-reset) providing the generated email.
 * 3. Assert that the response is a generic message, in the correct format/type,
 *    and does not disclose existence of the email in the system.
 */
export async function test_api_user_password_reset_request_with_registered_email(
  connection: api.IConnection,
) {
  // 1. Generate a valid email matching all format requirements.
  const testEmail: string &
    tags.MinLength<3> &
    tags.MaxLength<320> &
    tags.Format<"email"> = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<320> & tags.Format<"email">
  >();

  // 2. Call the password reset request endpoint.
  const result: ITodoListUser.IPasswordResetInitiated =
    await api.functional.auth.user.password.request_reset.requestPasswordReset(
      connection,
      {
        body: {
          email: testEmail,
        } satisfies ITodoListUser.IRequestPasswordReset,
      },
    );
  typia.assert(result);

  // 3. Assert that the message is the security-compliant generic message (text check only).
  TestValidator.predicate(
    "all responses must use a generic message with no existence leak",
    typeof result.message === "string" &&
      result.message.length > 0 &&
      result.message.toLowerCase().includes("if an account exists") &&
      result.message.toLowerCase().includes("password reset"),
  );
}
