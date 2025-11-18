import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Test password reset initiation with an unknown (unregistered) email address.
 *
 * Business context: This ensures the password reset endpoint does not reveal
 * whether an email exists in the database, preserving user privacy and
 * preventing user enumeration attacks.
 *
 * Test Steps:
 *
 * 1. Generate a random email address that is extremely unlikely to exist in the
 *    system.
 * 2. Submit a reset password request with this email.
 * 3. Validate that the response follows the generic success response pattern
 *    (i.e., { success: true }) regardless of the actual user existence.
 * 4. Confirm no error or indication is given about the existence or absence of the
 *    account associated with that email.
 * 5. (Negative assurance): Repeated requests with arbitrary unused emails always
 *    return the same generic success pattern without revealing information
 *    about system state or user records.
 */
export async function test_api_user_password_reset_request_unknown_email(
  connection: api.IConnection,
) {
  // 1. Generate a random email address unlikely to exist
  const unusedEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  // 2. Submit a password reset initiation request
  const requestBody = {
    email: unusedEmail,
  } satisfies ITodoUser.IResetPasswordRequest;
  const response: ITodoUser.IResetPasswordResponse =
    await api.functional.auth.user.password.reset_request.resetPassword(
      connection,
      { body: requestBody },
    );
  typia.assert(response);

  // 3. Validate the response: always generic (success: true)
  TestValidator.equals(
    "password reset request for unknown email always succeeds generically",
    response.success,
    true,
  );

  // 4-5. Repeat with another random, highly unlikely email to double-check behavior
  const anotherUnusedEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const anotherRequestBody = {
    email: anotherUnusedEmail,
  } satisfies ITodoUser.IResetPasswordRequest;
  const repeatResponse: ITodoUser.IResetPasswordResponse =
    await api.functional.auth.user.password.reset_request.resetPassword(
      connection,
      { body: anotherRequestBody },
    );
  typia.assert(repeatResponse);
  TestValidator.equals(
    "repeated unknown email request still returns generic success",
    repeatResponse.success,
    true,
  );
}
