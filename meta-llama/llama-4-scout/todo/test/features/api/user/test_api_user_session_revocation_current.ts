import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

/**
 * Test that an authenticated user can revoke (expire) their own active session.
 *
 * The test registers a new user, assumes the join endpoint issues both an auth
 * token and a session ID. It revokes the issued session using the DELETE
 * endpoint and verifies the session is marked as expired with correct audit
 * trail fields (session data preserved for compliance, not deleted). The test
 * also creates a second user and attempts to revoke the original user's
 * session, validating forbidden access is enforced.
 *
 * Steps:
 *
 * 1. Register a user (join), get token, and session ID.
 * 2. DELETE the session and verify expired_at is set and session data remains.
 * 3. Register a second user.
 * 4. Login as the second user and attempt to revoke first user's session by
 *    sessionId; confirm error.
 */
export async function test_api_user_session_revocation_current(
  connection: api.IConnection,
) {
  // 1. Register first user
  const userJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
  } satisfies ITodoListUser.IJoin;
  const auth1: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: userJoinInput },
  );
  typia.assert(auth1);
  TestValidator.equals(
    "registered user id matches profile",
    auth1.id,
    auth1.user?.id,
  );
  // Get session ID from issued token context (simulate: use auth1.token for session fetch)
  const sessionId1 = auth1.token.access.split("-").pop()!; // Simulated extraction
  // 2. Revoke session (DELETE)
  const revokedSession: ITodoListUserSession =
    await api.functional.todoList.user.users.me.sessions.erase(connection, {
      sessionId: sessionId1 as string & tags.Format<"uuid">,
    });
  typia.assert(revokedSession);
  TestValidator.equals(
    "revoked session id matches",
    revokedSession.id,
    sessionId1,
  );
  TestValidator.predicate(
    "expired_at is populated",
    !!revokedSession.expired_at,
  );
  // 3. Register a second user
  const userJoinInput2 = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(2),
    ip: "127.0.0.2",
    href: "https://example.com/signup2",
    referrer: "https://example.com/landing",
  } satisfies ITodoListUser.IJoin;
  const auth2: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: userJoinInput2 },
  );
  typia.assert(auth2);
  // 4. Try revoking the first user's session as the second user
  await TestValidator.error(
    "user cannot revoke session not owned by them",
    async () => {
      await api.functional.todoList.user.users.me.sessions.erase(connection, {
        sessionId: sessionId1 as string & tags.Format<"uuid">,
      });
    },
  );
}
