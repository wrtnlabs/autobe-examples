import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Validate password reset initiation for a valid (registered) email.
 *
 * This test ensures that invoking the password reset-request endpoint with a
 * valid, registered user email (from a freshly registered user) returns a
 * generic acceptance response without leaking any information about whether the
 * email is actually registered. It must always respond with { success: true }
 * for privacy. No user/account state changes are expected at this stage.
 *
 * 1. Register a new user (dependency) to obtain an existing email.
 * 2. Call the password reset-request endpoint with that registered email.
 * 3. Assert that the API response is { success: true } (generic acceptance).
 * 4. Confirm response is of ITodoUser.IResetPasswordResponse and contains no
 *    information about whether the email exists.
 * 5. No assertions about user/account state required.
 */
export async function test_api_user_password_reset_request_valid_email(
  connection: api.IConnection,
) {
  // 1. Register a user to create a known email
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/welcome",
  } satisfies ITodoUser.IJoin;
  const user = await api.functional.auth.user.join(connection, {
    body: joinBody,
  });
  typia.assert(user);

  // 2. Initiate password reset-request for the registered email
  const resetBody = {
    email: joinBody.email,
  } satisfies ITodoUser.IResetPasswordRequest;
  const output =
    await api.functional.auth.user.password.reset_request.resetPassword(
      connection,
      { body: resetBody },
    );
  typia.assert(output);

  // 3. Check response: must always be { success: true } (never leak if email exists)
  TestValidator.equals(
    "reset-request responds with generic success",
    output.success,
    true,
  );
}
