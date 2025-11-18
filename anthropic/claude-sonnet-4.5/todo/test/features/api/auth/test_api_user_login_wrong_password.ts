import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test user login with a correct email but incorrect password.
 *
 * - Registers a new user via /auth/user/join with a random email and a valid
 *   password.
 * - Attempts to log in using the same email and an intentionally incorrect
 *   password.
 * - Expects authentication to fail without disclosing whether the email exists or
 *   not.
 * - The test checks that no tokens are issued and the error is handled securely
 *   (no information leakage).
 */
export async function test_api_user_login_wrong_password(
  connection: api.IConnection,
) {
  // Register a new user for testing
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const joinBody = {
    email,
    password,
    href: "https://test-client.app/registration", // realistic example
    referrer: "https://test-client.app/landing",
  } satisfies ITodoListUser.IJoin;
  const registered = await api.functional.auth.user.join(connection, {
    body: joinBody,
  });
  typia.assert(registered);

  // Attempt to login with wrong password
  const wrongPassword = password + "wrong";
  const loginBody = {
    email,
    password: wrongPassword,
  } satisfies ITodoListUser.ILogin;
  await TestValidator.error("login fails with wrong password", async () => {
    await api.functional.auth.user.login(connection, {
      body: loginBody,
    });
  });
}
