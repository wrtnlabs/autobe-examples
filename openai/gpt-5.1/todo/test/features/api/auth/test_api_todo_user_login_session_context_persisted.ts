import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import type { ITodoAppTodoUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserJoin";
import type { ITodoAppTodoUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserLogin";

/**
 * Verify todoUser login accepts and works with rich session context.
 *
 * Business purpose:
 *
 * - Ensure that POST /auth/todoUser/login correctly authenticates an existing
 *   todo user when valid credentials are provided.
 * - Confirm that providing ip, href and referrer context fields does not cause
 *   validation issues and that the endpoint still issues a valid
 *   ITodoAppTodoUser.IAuthorized payload.
 * - Sanity check that bad credentials still fail even when valid context metadata
 *   is present.
 *
 * Steps:
 *
 * 1. Register a new todoUser via /auth/todoUser/join with realistic connection
 *    context (ip, href, referrer).
 * 2. Perform a successful login via /auth/todoUser/login using the same
 *    credentials and explicit ip, href, referrer values.
 * 3. Assert the login response matches ITodoAppTodoUser.IAuthorized and that
 *    token/access fields look usable.
 * 4. Attempt a second login with the same email but incorrect password and assert
 *    that it fails, while still sending valid context fields.
 */
export async function test_api_todo_user_login_session_context_persisted(
  connection: api.IConnection,
) {
  // 1. Register a new todo user with join, supplying context fields
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const joinHref: string & tags.Format<"uri"> =
    "https://app.example.com/join?campaign=summer";
  const joinReferrer: string & tags.Format<"uri"> =
    "https://app.example.com/landing";

  const joinRequest = {
    email,
    password,
    display_name: RandomGenerator.name(),
    ip: "198.51.100.23",
    href: joinHref,
    referrer: joinReferrer,
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const joined: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: joinRequest,
    });
  typia.assert<ITodoAppTodoUser.IAuthorized>(joined);

  TestValidator.equals(
    "joined email should match request email",
    joined.email,
    email,
  );

  // 2. Successful login with explicit session context fields
  const loginHref: string & tags.Format<"uri"> =
    "https://app.example.com/login?via=navbar";
  const loginReferrer: string & tags.Format<"uri"> =
    "https://app.example.com/landing";

  const loginRequest = {
    email,
    password,
    ip: "203.0.113.42",
    href: loginHref,
    referrer: loginReferrer,
  } satisfies ITodoAppTodoUserLogin.IRequest;

  const loggedIn: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.login(connection, {
      body: loginRequest,
    });
  typia.assert<ITodoAppTodoUser.IAuthorized>(loggedIn);

  // Basic behavioral assertions
  TestValidator.equals(
    "login email should equal joined email",
    loggedIn.email,
    email,
  );

  TestValidator.predicate(
    "login should issue non-empty access token",
    loggedIn.token.access.length > 0,
  );

  TestValidator.predicate(
    "login should have non-empty user id",
    loggedIn.id.length > 0,
  );

  // 3. Negative case: wrong password with valid context must fail
  const wrongPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const badLoginRequest = {
    email,
    password: wrongPassword,
    ip: "203.0.113.42",
    href: loginHref,
    referrer: loginReferrer,
  } satisfies ITodoAppTodoUserLogin.IRequest;

  await TestValidator.error(
    "login with wrong password should fail even with valid context",
    async () => {
      await api.functional.auth.todoUser.login(connection, {
        body: badLoginRequest,
      });
    },
  );
}
