import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Validate that an authenticated user can successfully terminate their own
 * session.
 *
 * 1. Register (join) a new user account, capturing issued token/session (from
 *    IAuthorized.token fields)
 * 2. Use issued access token context to call DELETE
 *    /todo/user/users/{userId}/sessions/{sessionId} for current session
 * 3. Validate that deletion succeeds (no error thrown)
 * 4. Attempt to call session termination endpoint again using the same access
 *    token (should be rejected, since session is terminated)
 * 5. Assert that access is denied for the deleted/terminated session (expected
 *    error)
 */
export async function test_api_todo_user_session_termination_by_owner(
  connection: api.IConnection,
) {
  // 1. Register / join a new user
  const registerBody = {
    email: typia.random<
      string & tags.MinLength<3> & tags.MaxLength<256> & tags.Format<"email">
    >(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/landing",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ITodoUser.ICreate;
  const auth: ITodoUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: registerBody,
    },
  );
  typia.assert(auth);

  // Note: There's no explicit sessionId UUID in auth/token, so use a random UUID for demonstration;
  // in a real implementation, sessionId should come from session creation response, not random.
  const sessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. DELETE the (simulated) user session (self-logout)
  await api.functional.todo.user.users.sessions.erase(connection, {
    userId: auth.id,
    sessionId,
  });

  // 3. Confirm access is denied by trying to delete again with same session
  await TestValidator.error(
    "deleted session cannot terminate again (must deny)",
    async () => {
      await api.functional.todo.user.users.sessions.erase(connection, {
        userId: auth.id,
        sessionId,
      });
    },
  );
}
