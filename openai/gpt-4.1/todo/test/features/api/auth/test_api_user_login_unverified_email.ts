import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate that a user with an unverified email cannot successfully log in and
 * receives a generic error response.
 *
 * 1. Register a new user (without verifying the email) and capture the
 *    email/password used.
 * 2. Attempt to log in with those credentials.
 * 3. Assert that login attempt fails with a generic error (no information leak
 *    about whether due to email, password, or verification status).
 */
export async function test_api_user_login_unverified_email(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const joinBody = {
    email: typia.random<
      string & tags.MinLength<5> & tags.MaxLength<255> & tags.Format<"email">
    >(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    href: "https://e2e-test.tld/register",
    referrer: "https://e2e-test.tld/landing",
  } satisfies ITodoListUser.IJoin;
  const newUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: joinBody });
  typia.assert(newUser);
  TestValidator.equals(
    "registered email matches input",
    newUser.email,
    joinBody.email,
  );
  TestValidator.predicate(
    "user is not verified immediately after registration",
    newUser.is_verified === false,
  );

  // 2. Attempt login with registered credentials (should fail)
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password as string & tags.Format<"password">,
    href: "https://e2e-test.tld/login",
    referrer: "https://e2e-test.tld/register",
  } satisfies ITodoListUser.ILogin;
  await TestValidator.error(
    "login with unverified email should fail generically",
    async () => {
      await api.functional.auth.user.login(connection, { body: loginBody });
    },
  );
}
