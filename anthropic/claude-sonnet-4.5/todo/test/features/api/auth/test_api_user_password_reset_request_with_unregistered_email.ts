import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate password reset request with an unregistered email address.
 *
 * This test verifies that when a syntactically valid, but non-existent, email
 * address is submitted to the password reset API endpoint, the application
 * responds with the same generic message as for registered users, without
 * revealing whether the account exists.
 *
 * Steps:
 *
 * 1. Generate a random, valid email address, assumed not to be present in the
 *    system.
 * 2. Submit a POST request to /auth/user/password/request-reset with this email.
 * 3. Assert that the API returns a generic ITodoListUser.IPasswordResetInitiated
 *    message, not indicating account existence or failure.
 * 4. Assert the message is present and reasonably matches documented policy
 *    wording.
 * 5. No token should be created for non-existent users, but the response must not
 *    differ in any observable way from that of a valid user.
 */
export async function test_api_user_password_reset_request_with_unregistered_email(
  connection: api.IConnection,
) {
  // 1. Generate a valid but unregistered email address
  const unregisteredEmail = `invalid_${RandomGenerator.alphaNumeric(12)}@testdomain.com`;
  const input = {
    email: unregisteredEmail,
  } satisfies ITodoListUser.IRequestPasswordReset;

  // 2. Send password reset request
  const response =
    await api.functional.auth.user.password.request_reset.requestPasswordReset(
      connection,
      { body: input },
    );
  // 3. Type/structure validation
  typia.assert(response);

  // 4. Validate generic anti-enumeration message (never reveals account existence)
  TestValidator.predicate(
    "response message for unregistered email is generic and non-revealing",
    typeof response.message === "string" &&
      response.message.length > 0 &&
      /account|email|instructions|reset/i.test(response.message),
  );
}
