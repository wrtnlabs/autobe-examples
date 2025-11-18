import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Ensures the login attempt fails when the password provided is incorrect,
 * while the email exists.
 *
 * Business context:
 *
 * - Verifies the authentication system securely rejects login with a valid email
 *   but wrong password.
 * - Ensures that no sensitive information is leaked when login fails (e.g.,
 *   system does not reveal which credential is incorrect).
 * - Only error occurrence is validated—not error message or HTTP status code.
 *
 * Steps:
 *
 * 1. Register a new user with valid random credentials.
 * 2. Attempt to log in to that email with a wrong password but valid context
 *    fields.
 * 3. Assert that authentication fails, and an error is thrown without examining
 *    the message.
 */
export async function test_api_user_login_failure_wrong_password(
  connection: api.IConnection,
) {
  // 1. Register a new user.
  const registrationBody = {
    email: typia.random<
      string & tags.MinLength<3> & tags.MaxLength<255> & tags.Format<"email">
    >(),
    password: typia.random<
      string & tags.MinLength<8> & tags.MaxLength<72> & tags.Format<"password">
    >(),
  } satisfies ITodoListUser.ICreate;
  const user = await api.functional.auth.user.join(connection, {
    body: registrationBody,
  });
  typia.assert(user);

  // 2. Attempt login with correct email, wrong password, valid context.
  const loginBody = {
    email: registrationBody.email,
    password: typia.random<
      string & tags.MinLength<8> & tags.MaxLength<72> & tags.Format<"password">
    >(), // intentionally wrong
    href: "https://todolist.example.com/login",
    referrer: "https://todolist.example.com/",
  } satisfies ITodoListUser.ILogin;

  await TestValidator.error(
    "login with wrong password should be rejected",
    async () => {
      await api.functional.auth.user.login(connection, { body: loginBody });
    },
  );
}
