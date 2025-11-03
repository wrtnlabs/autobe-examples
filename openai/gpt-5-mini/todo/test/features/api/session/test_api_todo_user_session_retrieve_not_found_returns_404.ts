import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import type { ITodoAppTodouserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodouserSession";

/**
 * Validate that retrieving a non-existent session by a well-formed UUID returns
 * HTTP 404 (Not Found) for the authenticated owning user.
 *
 * Steps:
 *
 * 1. Register a new todoUser via POST /auth/todoUser/join to obtain an
 *    authenticated context and todoUser id
 * 2. Attempt to GET a session using a valid-but-nonexistent UUID
 * 3. Assert that the call fails with HTTP 404
 */
export async function test_api_todo_user_session_retrieve_not_found_returns_404(
  connection: api.IConnection,
) {
  // 1) Create an authenticated todoUser (join)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoUser.ICreate;

  const authorized: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, { body: joinBody });
  typia.assert(authorized);

  // Sanity check: token exists and user id is present
  TestValidator.predicate(
    "join returns authorization token and user id",
    typeof authorized.token?.access === "string" &&
      authorized.token.access.length > 0 &&
      typeof authorized.id === "string",
  );

  // 2) Use a well-formed but unlikely-to-exist session UUID
  const nonExistentSessionId = "11111111-1111-1111-1111-111111111111";

  // 3) Attempt retrieval and expect HTTP 404
  await TestValidator.httpError(
    "retrieving non-existent session should return 404",
    404,
    async () => {
      await api.functional.todoApp.todoUser.todoUsers.sessions.at(connection, {
        todoUserId: authorized.id,
        sessionId: nonExistentSessionId,
      });
    },
  );
}
