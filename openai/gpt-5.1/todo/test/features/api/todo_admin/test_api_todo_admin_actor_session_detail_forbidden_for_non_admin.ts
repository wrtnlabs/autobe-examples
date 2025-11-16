import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppActorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppActorSession";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import type { ITodoAppTodoUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserJoin";

export async function test_api_todo_admin_actor_session_detail_forbidden_for_non_admin(
  connection: api.IConnection,
) {
  // 1. Prepare base unauthenticated connection to avoid header side effects
  const baseConnection: api.IConnection = { ...connection, headers: {} };

  // 2. Register a todoUser and obtain its authorized context (and token)
  const todoUserJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://todo-app.example.com/signup",
    referrer: "https://todo-app.example.com/landing",
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const todoUserAuthorized: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(baseConnection, {
      body: todoUserJoinBody,
    });
  typia.assert<ITodoAppTodoUser.IAuthorized>(todoUserAuthorized);

  // At this point, baseConnection.headers.Authorization contains the todoUser token

  // 3. Register a todoAdmin in a separate connection so that an admin exists
  const adminConnection: api.IConnection = { ...connection, headers: {} };

  const todoAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://todo-app.example.com/admin/signup",
    referrer: "https://todo-app.example.com/admin/landing",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const todoAdminAuthorized: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(adminConnection, {
      body: todoAdminJoinBody,
    });
  typia.assert<ITodoAppTodoAdmin.IAuthorized>(todoAdminAuthorized);

  // 4. With todoUser-authenticated connection, attempt to call admin-only session detail API
  const userAuthConnection: api.IConnection = baseConnection;

  const targetSessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  await TestValidator.httpError(
    "non-admin todoUser cannot access admin actor session detail",
    403,
    async () => {
      await api.functional.todoApp.todoAdmin.actors.sessions.at(
        userAuthConnection,
        {
          sessionId: targetSessionId,
        },
      );
    },
  );
}
