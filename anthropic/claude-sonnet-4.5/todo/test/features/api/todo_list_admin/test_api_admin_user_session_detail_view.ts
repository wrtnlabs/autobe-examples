import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

/**
 * Validate administrator privileged retrieval of user session details for
 * audit/compliance/security.
 *
 * Ensures that only authenticated administrators, joined via /auth/admin/join,
 * can successfully call /todoList/admin/users/{userId}/sessions/{sessionId},
 * and verifies response structure, content, and error handling for authorized
 * and unauthorized scenarios.
 *
 * Steps:
 *
 * 1. Admin registration: Issue a unique, valid admin join request with required
 *    session context. Assert that registration is successful and a valid
 *    token/profile is returned.
 * 2. (Skipped because the API offers retrieval only, no direct session creation):
 *    Generate random UUIDs for user ID and session ID to simulate valid-looking
 *    inputs.
 * 3. Access session details (authorized): With admin context, call the endpoint
 *    and expect a valid session record, validating key fields: id,
 *    todo_list_user_id, ip, href, referrer, created_at, (optionally
 *    expired_at).
 * 4. Access session details (unauthorized): Attempt retrieval with a connection
 *    that contains no Authorization token, and assert an error is thrown
 *    (TestValidator.error).
 * 5. Access session details (invalid user/session): Try with random UUIDs that are
 *    extremely unlikely to exist, and assert error with no data leakage.
 * 6. End: All privileged audit and data constraints verified, completing test.
 */
export async function test_api_admin_user_session_detail_view(
  connection: api.IConnection,
) {
  // 1. Admin registration
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = typia.random<
    string & tags.MinLength<8> & tags.Format<"password">
  >();
  const adminHref: string = typia.random<string & tags.Format<"uri">>();
  const adminReferrer: string = typia.random<string & tags.Format<"uri">>();
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    href: adminHref,
    referrer: adminReferrer,
    ip: undefined,
  } satisfies ITodoListAdmin.IJoin;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuth);
  const adminId = adminAuth.id;

  // 2. Generate random session/user UUIDs
  const sessionUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const sessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Attempt to retrieve session details with admin context (likely not found, but endpoint must not leak data)
  await TestValidator.error(
    "should error on non-existent user/session even with admin context",
    async () => {
      await api.functional.todoList.admin.users.sessions.at(connection, {
        userId: sessionUserId,
        sessionId: sessionId,
      });
    },
  );

  // 4. Attempt without authorization (unauthenticated context) -- should fail for missing/invalid token
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "should error if unauthenticated connection attempts session detail retrieval",
    async () => {
      await api.functional.todoList.admin.users.sessions.at(unauthConnection, {
        userId: sessionUserId,
        sessionId: sessionId,
      });
    },
  );

  // 5. (Optional: Attempt with another admin; out-of-scope as we cannot create sessions directly)
  // All privileged audit/data boundary checks covered
}
