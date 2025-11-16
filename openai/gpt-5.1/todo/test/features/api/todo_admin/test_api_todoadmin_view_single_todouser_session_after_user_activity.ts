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

export async function test_api_todoadmin_view_single_todouser_session_after_user_activity(
  connection: api.IConnection,
) {
  // 1. Create a todoUser via join to ensure there is at least one session
  const todoUserJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://todo-app.example.com/join",
    referrer: "https://landing.example.com/",
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const todoUser: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: todoUserJoinBody,
    });
  typia.assert(todoUser);

  // 2. Exercise some todoUser activity: login and create + complete a todo
  const todoUserLoginBody = {
    email: todoUser.email,
    password: todoUserJoinBody.password,
    ip: "127.0.0.1",
    href: "https://todo-app.example.com/login",
    referrer: "https://todo-app.example.com/join",
  } satisfies ITodoAppTodoUserLogin.IRequest;

  const todoUserAfterLogin: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.login(connection, {
      body: todoUserLoginBody,
    });
  typia.assert(todoUserAfterLogin);

  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    due_date: new Date().toISOString(),
    status_code: null,
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.todoUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert(createdTodo);

  const completedTodo: ITodoAppTodo =
    await api.functional.todoApp.todoUser.todos.complete(connection, {
      todoId: createdTodo.id,
    });
  typia.assert(completedTodo);
  TestValidator.predicate(
    "todo has completion timestamp",
    completedTodo.completed_at !== null &&
      completedTodo.completed_at !== undefined,
  );

  // 3. Register a todoAdmin and obtain admin authorization
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://todo-app.example.com/admin/join",
    referrer: "https://landing.example.com/admin",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const admin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 4. As admin, retrieve a todo user session
  const todoUserId = todoUser.id;
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  const session: ITodoAppTodouserSession =
    await api.functional.todoApp.todoAdmin.todoUsers.sessions.at(connection, {
      todoUserId,
      sessionId,
    });
  typia.assert(session);

  // 5. Validate basic invariants on the session
  TestValidator.predicate("session id is non-empty", session.id.length > 0);
  TestValidator.predicate("session ip is non-empty", session.ip.length > 0);
  TestValidator.predicate("session href is non-empty", session.href.length > 0);
  TestValidator.predicate(
    "session referrer is non-empty",
    session.referrer.length > 0,
  );
  TestValidator.predicate(
    "session created_at is non-empty",
    session.created_at.length > 0,
  );

  if (session.owner !== undefined) {
    TestValidator.equals(
      "session owner id equals todoUser id",
      session.owner.id,
      todoUserId,
    );
    TestValidator.equals(
      "session owner email equals todoUser email",
      session.owner.email,
      todoUser.email,
    );
  }

  // 6. Verify that regular todoUser cannot use the admin-only endpoint
  const todoUserReLogin: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.login(connection, {
      body: todoUserLoginBody,
    });
  typia.assert(todoUserReLogin);

  await TestValidator.error(
    "todoUser cannot access admin-only todo user session endpoint",
    async () => {
      await api.functional.todoApp.todoAdmin.todoUsers.sessions.at(connection, {
        todoUserId,
        sessionId,
      });
    },
  );
}
