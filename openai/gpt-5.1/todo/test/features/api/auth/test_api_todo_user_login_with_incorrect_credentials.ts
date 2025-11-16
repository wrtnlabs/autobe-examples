import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import type { ITodoAppTodoUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserJoin";
import type { ITodoAppTodoUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserLogin";

/**
 * Validate that todoUser login rejects incorrect credentials.
 *
 * Business goal: Ensure POST /auth/todoUser/login does not authenticate users
 * when provided with invalid credentials (wrong password or non-existent
 * email). The test must exercise only type-safe, business-logic-based failures
 * without any deliberate type errors or low-level HTTP status assertions.
 *
 * High-level steps:
 *
 * 1. Register a valid todoUser via POST /auth/todoUser/join using a known email
 *    and password, plus realistic href/referrer metadata.
 * 2. Attempt to login with the same email but an incorrect password and verify
 *    that login fails (Promise rejects) via TestValidator.error.
 * 3. Attempt to login with a non-existent email and any password and verify that
 *    login fails (Promise rejects) via TestValidator.error.
 * 4. Use only correct DTO types (ITodoAppTodoUserJoin.IRequest and
 *    ITodoAppTodoUserLogin.IRequest) and avoid checking specific HTTP status
 *    codes or error messages.
 */
export async function test_api_todo_user_login_with_incorrect_credentials(
  connection: api.IConnection,
) {
  // 1. Register a valid todoUser with deterministic credentials
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const joinBody = {
    email,
    password,
    display_name: RandomGenerator.name(),
    href: "https://todo-app.example.com/signup",
    referrer: "https://todo-app.example.com/landing",
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const joined: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ITodoAppTodoUser.IAuthorized>(joined);

  // 2. Negative case A: correct email, incorrect password
  const wrongPasswordLoginBody = {
    email,
    password: password + "_wrong", // still a string, business-logic failure
    ip: null,
    href: "https://todo-app.example.com/login",
    referrer: "https://todo-app.example.com/landing",
  } satisfies ITodoAppTodoUserLogin.IRequest;

  await TestValidator.error(
    "login fails with correct email but wrong password",
    async () => {
      await api.functional.auth.todoUser.login(connection, {
        body: wrongPasswordLoginBody,
      });
    },
  );

  // 3. Negative case B: non-existent email, any password
  const nonExistentEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const nonExistingUserLoginBody = {
    email: nonExistentEmail,
    password,
    ip: null,
    href: "https://todo-app.example.com/login",
    referrer: "https://todo-app.example.com/marketing",
  } satisfies ITodoAppTodoUserLogin.IRequest;

  await TestValidator.error("login fails with non-existent email", async () => {
    await api.functional.auth.todoUser.login(connection, {
      body: nonExistingUserLoginBody,
    });
  });
}
