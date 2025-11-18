import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that login is forbidden using email and password for a just-registered
 * user whose email is still unverified.
 *
 * 1. Register a new user, but do NOT perform any email verification simulation or
 *    completion process.
 * 2. Attempt to log in with the just-registered user's correct email and password.
 * 3. The login should fail: TestValidator.error must be used to verify that the
 *    login is rejected due to unverified email.
 * 4. The failure code path must NOT issue any IAuthorizationToken or session.
 *
 * This test enforces the business rule: login is only allowed after email
 * verification is successfully completed.
 */
export async function test_api_todo_list_user_login_fail_unverified_email(
  connection: api.IConnection,
) {
  // 1. Register user but do not verify the email
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const joinInput = {
    email,
    password,
    href: "https://test-app.example/join",
    referrer: "https://test-app.example/landing",
    display_name: RandomGenerator.name(),
  } satisfies ITodoListUser.ICreate;
  const registered = await api.functional.auth.user.join(connection, {
    body: joinInput,
  });
  typia.assert(registered);

  // 2. Try to login with the new account, which is unverified
  await TestValidator.error("login must fail for unverified user", async () => {
    await api.functional.auth.user.login(connection, {
      body: {
        email,
        password,
        href: "https://test-app.example/login",
        referrer: "https://test-app.example/login",
      } satisfies ITodoListUser.ILogin,
    });
  });
}
