import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

/**
 * Test session retrieval rejection when user attempts to access another user's
 * session.
 *
 * This test validates strict data isolation enforcement by attempting to access
 * a session using a random session ID (simulating another user's session).
 * Since users should only be able to access their own sessions, any attempt to
 * access a session ID that doesn't belong to the authenticated user should
 * fail.
 *
 * Steps:
 *
 * 1. Create first user account (User A) through registration
 * 2. Create second user account (User B) through registration
 * 3. Generate a random session ID (simulating User A's or any other user's
 *    session)
 * 4. While authenticated as User B, attempt to retrieve the random session ID
 * 5. Verify the operation fails with authorization/not found error
 *
 * Validation points:
 *
 * - System enforces data isolation between user accounts
 * - User cannot access arbitrary session IDs
 * - Error response indicates session not found or unauthorized access
 * - Session data remains protected across user boundaries
 *
 * Note: Due to API limitations (no session listing endpoint available), we use
 * a random session ID to simulate attempting to access another user's session.
 * The test validates that the system properly rejects access to session IDs
 * that don't belong to the authenticated user.
 */
export async function test_api_user_session_retrieval_other_user_session(
  connection: api.IConnection,
) {
  // Step 1: Create first user account (User A)
  const userAEmail = typia.random<string & tags.Format<"email">>();
  const userAPassword = typia.random<string & tags.MinLength<8>>();

  const userAData = {
    email: userAEmail,
    password: userAPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListUser.ICreate;

  const userA = await api.functional.auth.user.join(connection, {
    body: userAData,
  });
  typia.assert(userA);

  // Step 2: Create second user account (User B) - this switches authentication context
  const userBEmail = typia.random<string & tags.Format<"email">>();
  const userBPassword = typia.random<string & tags.MinLength<8>>();

  const userBData = {
    email: userBEmail,
    password: userBPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListUser.ICreate;

  const userB = await api.functional.auth.user.join(connection, {
    body: userBData,
  });
  typia.assert(userB);

  // Step 3: Generate a random session ID that doesn't belong to User B
  // This simulates attempting to access another user's session
  const otherUserSessionId = typia.random<string & tags.Format<"uuid">>();

  // Step 4 & 5: Attempt to retrieve the other user's session while authenticated as User B
  // This should fail because the session either doesn't exist or belongs to a different user
  await TestValidator.error(
    "should not be able to access session that doesn't belong to authenticated user",
    async () => {
      await api.functional.todoList.user.users.me.sessions.at(connection, {
        sessionId: otherUserSessionId,
      });
    },
  );
}
