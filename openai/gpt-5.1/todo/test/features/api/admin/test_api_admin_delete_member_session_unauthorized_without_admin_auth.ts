import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

export async function test_api_admin_delete_member_session_unauthorized_without_admin_auth(
  connection: api.IConnection,
) {
  // 1. Register a member user and obtain authorized context (member token + memberUserId)
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://todo-app.example.com/signup",
    referrer: "https://todo-app.example.com/",
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const memberAuthorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Use the member token to create a todo (to ensure the session/account is active)
  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert(createdTodo);

  // Ensure the todo is owned by the created member user
  TestValidator.equals(
    "created todo is owned by the joined member user",
    createdTodo.memberUser.id,
    memberAuthorized.id,
  );

  // 3. Prepare a synthetic sessionId for test purposes (authz is what matters here)
  const fakeSessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Build an unauthenticated connection (no Authorization header)
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4-1. Attempt erase with NO Authorization header -> expect 401 or 403
  await TestValidator.httpError(
    "unauthenticated caller cannot erase member user session",
    [401, 403],
    async () => {
      await api.functional.todoApp.adminUser.memberUsers.sessions.erase(
        unauthConnection,
        {
          memberUserId: memberAuthorized.id,
          sessionId: fakeSessionId,
        },
      );
    },
  );

  // 5. Using the memberUser token (on the original connection), attempt the admin erase
  await TestValidator.httpError(
    "member user token cannot erase member user session via admin endpoint",
    [401, 403],
    async () => {
      await api.functional.todoApp.adminUser.memberUsers.sessions.erase(
        connection,
        {
          memberUserId: memberAuthorized.id,
          sessionId: fakeSessionId,
        },
      );
    },
  );
}
