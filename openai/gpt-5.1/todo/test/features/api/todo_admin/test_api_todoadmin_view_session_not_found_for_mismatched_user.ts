import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";
import type { ITodoAppTodoAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminLogin";
import type { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import type { ITodoAppTodoUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserJoin";
import type { ITodoAppTodoUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserLogin";
import type { ITodoAppTodouserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodouserSession";

export async function test_api_todoadmin_view_session_not_found_for_mismatched_user(
  connection: api.IConnection,
) {
  // 1. Register User A (todoUser join) – creates an account and an initial session.
  const userAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://todo-app.example.com/join",
    referrer: "https://landing.example.com",
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const userA: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: userAJoinBody,
    });
  typia.assert<ITodoAppTodoUser.IAuthorized>(userA);

  // 2. Login as User A – this ensures at least one login session exists in the
  //    todo_app_todouser_sessions table for User A, though we cannot see its id.
  const userALoginBody = {
    email: userA.email,
    password: userAJoinBody.password,
    ip: userAJoinBody.ip,
    href: userAJoinBody.href,
    referrer: userAJoinBody.referrer,
  } satisfies ITodoAppTodoUserLogin.IRequest;

  const userALogin: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.login(connection, {
      body: userALoginBody,
    });
  typia.assert<ITodoAppTodoUser.IAuthorized>(userALogin);

  // 3. Register User B – second todo user with a different email.
  const userBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://todo-app.example.com/join",
    referrer: "https://landing.example.com",
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const userB: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: userBJoinBody,
    });
  typia.assert<ITodoAppTodoUser.IAuthorized>(userB);

  // 4. Register todoAdmin and then login to establish admin context.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://todo-app.example.com/admin/join",
    referrer: "https://todo-app.example.com/admin",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminJoined: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ITodoAppTodoAdmin.IAuthorized>(adminJoined);

  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: adminJoinBody.ip,
    href: "https://todo-app.example.com/admin/login",
    referrer: adminJoinBody.href,
  } satisfies ITodoAppTodoAdminLogin.IRequest;

  const adminLoggedIn: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<ITodoAppTodoAdmin.IAuthorized>(adminLoggedIn);

  // 5. Prepare mismatched identifiers: use User B's id as todoUserId and a
  //    random UUID as the sessionId. We cannot access real session IDs through
  //    any public API, so we intentionally use a random UUID which should not
  //    resolve to an existing session for User B.
  const mismatchedTodoUserId = userB.id;
  const randomSessionId = typia.random<string & tags.Format<"uuid">>();

  // 6. As an authenticated todoAdmin, attempt to fetch a session for User B
  //    using the random sessionId and assert that the API responds with a
  //    404-style not-found HTTP error.
  await TestValidator.httpError(
    "admin cannot view non-existent or foreign session by mismatched user/session pair",
    404,
    async () => {
      await api.functional.todoApp.todoAdmin.todoUsers.sessions.at(connection, {
        todoUserId: mismatchedTodoUserId,
        sessionId: randomSessionId,
      });
    },
  );
}
