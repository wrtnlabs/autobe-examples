import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import type { ITodoAppTodoUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserJoin";
import type { ITodoAppTodoUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserLogin";

/**
 * Validate negative login behavior for todoUser accounts.
 *
 * Business goal: ensure that the todoUser authentication flow only returns an
 * ITodoAppTodoUser.IAuthorized payload when the credentials and account state
 * are eligible for login, and that error scenarios do not produce an
 * authorization payload.
 *
 * Due to the absence of any admin or lifecycle-mutation API in the provided
 * SDK, this test cannot directly toggle the `status` field of a stored todoUser
 * to `suspended` or `closed`. Instead, the test focuses on a realistic,
 * implementable subset of the scenario:
 *
 * - Prove that join + login with correct credentials works and returns a
 *   well-typed ITodoAppTodoUser.IAuthorized payload.
 * - Prove that login with incorrect credentials fails and does not return a
 *   successful authorization payload.
 *
 * This still validates the critical invariant that /auth/todoUser/login only
 * succeeds for valid, login-eligible situations, while staying within the
 * limits of the actually exposed APIs. Direct status-based blocking (e.g.,
 * `suspended`/`closed`) would be covered in other tests that exercise admin or
 * lifecycle endpoints once available.
 */
export async function test_api_todo_user_login_blocked_by_account_status(
  connection: api.IConnection,
) {
  // 1. Register a new todoUser via join to obtain valid credentials and a
  //    baseline authorized payload.
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    ip: RandomGenerator.mobile(),
    href: "https://todo.example.com/signup",
    referrer: "https://todo.example.com/landing",
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const joined: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: joinRequest,
    });
  typia.assert(joined);

  // Basic sanity checks on the join result.
  TestValidator.predicate(
    "joined todoUser id must be a non-empty UUID string",
    () => joined.id.length > 0,
  );
  TestValidator.equals(
    "joined email should match join request",
    joined.email,
    joinRequest.email,
  );

  // 2. Perform a normal login with the same credentials to demonstrate that
  //    correct credentials produce an ITodoAppTodoUser.IAuthorized payload.
  const loginRequest = {
    email: joinRequest.email,
    password: joinRequest.password,
    href: "https://todo.example.com/login",
    referrer: "https://todo.example.com/landing",
  } satisfies ITodoAppTodoUserLogin.IRequest;

  const loggedIn: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.login(connection, {
      body: loginRequest,
    });
  typia.assert(loggedIn);

  TestValidator.equals(
    "login email should match original join email",
    loggedIn.email,
    joinRequest.email,
  );

  // 3. Validate that login fails when credentials are not eligible (wrong
  //    password). We do not assert HTTP status codes; we only assert that an
  //    error is thrown and no ITodoAppTodoUser.IAuthorized payload is
  //    produced.
  const wrongPasswordLoginRequest = {
    email: joinRequest.email,
    password: `${joinRequest.password}-wrong`,
    href: "https://todo.example.com/login",
    referrer: "https://todo.example.com/landing",
  } satisfies ITodoAppTodoUserLogin.IRequest;

  await TestValidator.error(
    "login with wrong password must fail and not return an authorization payload",
    async () => {
      // This call is expected to throw; if it returns, TestValidator.error will
      // treat it as a failure.
      await api.functional.auth.todoUser.login(connection, {
        body: wrongPasswordLoginRequest,
      });
    },
  );
}
