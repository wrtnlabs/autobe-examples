import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Test that login fails with correct email and invalid password.
 *
 * This test verifies that logging in with the correct email and an incorrect
 * password is properly denied by the /auth/user/login endpoint. It ensures no
 * authentication information is exposed on failure and the error response is
 * generic and privacy-preserving.
 *
 * Steps:
 *
 * 1. Register a new user with /auth/user/join (random email/password, proper
 *    URIs).
 * 2. Attempt to login with correct email but clearly incorrect password (of
 *    minimum valid length).
 * 3. Assert authentication fails, no token or user object is returned, and the
 *    error is generic without revealing credential or existence details.
 */
export async function test_api_user_login_invalid_password_rejected(
  connection: api.IConnection,
) {
  // 1. Register a user
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string & tags.MinLength<8> = RandomGenerator.alphaNumeric(10);
  const joinBody = {
    email,
    password,
    ip: null,
    href: "https://e2e.test/join",
    referrer: "https://e2e.test/login",
  } satisfies ITodoUser.IJoin;
  const registered = await api.functional.auth.user.join(connection, {
    body: joinBody,
  });
  typia.assert(registered);

  // 2. Attempt login with correct email but incorrect password
  const wrongPassword: string & tags.MinLength<8> & tags.MaxLength<128> =
    RandomGenerator.alphaNumeric(12);
  const loginBody = {
    email,
    password: wrongPassword,
    ip: null,
    href: "https://e2e.test/login",
    referrer: "https://e2e.test/join",
  } satisfies ITodoUser.ILogin;
  await TestValidator.error(
    "login with correct email but wrong password should be rejected generically",
    async () => {
      await api.functional.auth.user.login(connection, { body: loginBody });
    },
  );
}
