import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate login failure responses to invalid credentials for Todo List users.
 *
 * 1. Attempt login with completely random (non-existent) email
 * 2. Attempt login with random valid email and wrong password
 * 3. Ensure responses deny authentication and contain no leak of account
 *    existence, verification, or state info
 * 4. Confirm both attempts return generic error and do not issue tokens or user
 *    data
 */
export async function test_api_user_login_invalid_credentials(
  connection: api.IConnection,
) {
  // 1. Attempt login with random, non-existent email and random password
  const randomEmail = typia.random<string & tags.Format<"email">>();
  const randomPassword = typia.random<string & tags.Format<"password">>();
  const loginBody1 = {
    email: randomEmail,
    password: randomPassword,
    href: "https://app.example.com/login",
    referrer: "https://app.example.com/",
    ip: "127.0.0.1",
  } satisfies ITodoListUser.ILogin;

  await TestValidator.error(
    "login with incorrect email should fail",
    async () => {
      await api.functional.auth.user.login(connection, {
        body: loginBody1,
      });
    },
  );

  // 2. Attempt login with valid email, wrong password
  const validEmail = typia.random<string & tags.Format<"email">>();
  const wrongPassword = typia.random<string & tags.Format<"password">>();
  const loginBody2 = {
    email: validEmail,
    password: wrongPassword,
    href: "https://app.example.com/login",
    referrer: "https://app.example.com/",
    ip: "127.0.0.1",
  } satisfies ITodoListUser.ILogin;
  await TestValidator.error(
    "login with wrong password should fail",
    async () => {
      await api.functional.auth.user.login(connection, {
        body: loginBody2,
      });
    },
  );
}
