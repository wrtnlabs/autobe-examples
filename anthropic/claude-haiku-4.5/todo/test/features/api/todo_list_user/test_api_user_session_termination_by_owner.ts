import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validates that an authenticated user can terminate (delete) their own session
 * by sessionId, ensuring permanent deletion and removal of session/audit
 * records. Business context: A user should be able to delete their own session,
 * which permanently invalidates the session and prevents any further
 * authenticated use of that session. The operation must strictly enforce
 * self-ownership (no admin/cross-user erase), and repeated attempts to delete a
 * previously deleted session must fail.
 *
 * 1. Register new user (join) to create initial session and tokens; extract
 *    sessionId from authorized.id.
 * 2. Delete that session by calling DELETE
 *    /todoList/user/users/me/sessions/{sessionId} as self.
 * 3. Attempt second delete using same sessionId, confirming it fails (session is
 *    already gone). Note: Cannot further test token invalidation reuse or audit
 *    context removal due to API constraints.
 */
export async function test_api_user_session_termination_by_owner(
  connection: api.IConnection,
) {
  // 1. Register a new user and obtain authentication/session
  const userJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://app.todo.local/register",
    referrer: "https://app.todo.local/login",
  } satisfies ITodoListUser.IJoin;
  const authorized: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: userJoinBody });
  typia.assert(authorized);

  // 2. Extract sessionId from registered user ID
  const sessionId = authorized.id;

  // 3. Delete the session using the erase API
  await api.functional.todoList.user.users.me.sessions.erase(connection, {
    sessionId,
  });

  // 4. Second delete attempt must fail
  await TestValidator.error(
    "subsequent deletion of already deleted sessionId must fail",
    async () => {
      await api.functional.todoList.user.users.me.sessions.erase(connection, {
        sessionId,
      });
    },
  );
}
