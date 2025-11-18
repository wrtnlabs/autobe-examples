import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUserSession";

/**
 * Verify public access to session detail retrieval for a todo user session.
 *
 * This test performs the following steps:
 *
 * 1. Uses random UUIDs for userId and sessionId to request a session detail
 *    (likely not found). Expects error handling (e.g., not found/permission
 *    error).
 * 2. Generates a valid mock session via typia, then attempts retrieval by
 *    userId/sessionId. Verifies all returned fields (id, todo_user_id, ip,
 *    href, referrer, created_at, expired_at) are present and correctly
 *    typed/formatted. Ensures expired_at is either a date-time string or
 *    null/undefined according to session status.
 * 3. Simulates expired vs active session: fetches with expired_at set and not set.
 *    Verifies that the expired_at field reflects the correct expiration state
 *    and is correctly reflected in API response.
 *
 * No authentication or POST/PUT operations are used. Endpoint must be
 * public-read and read-only.
 */
export async function test_api_todo_user_sessions_single_session_detail_public_access(
  connection: api.IConnection,
) {
  // 1. Fetch with likely nonexistent UUIDs
  const notFoundUserId = typia.random<string & tags.Format<"uuid">>();
  const notFoundSessionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should error for non-existent user/session UUID",
    async () => {
      await api.functional.todo.users.sessions.at(connection, {
        userId: notFoundUserId,
        sessionId: notFoundSessionId,
      });
    },
  );

  // 2. Generate a random valid session, fetch, and check fields
  // Use simulate:true to guarantee session exists for fetch
  const simulatedConnection: api.IConnection = {
    ...connection,
    simulate: true,
  };
  const session = await api.functional.todo.users.sessions.at(
    simulatedConnection,
    {
      userId: typia.random<string & tags.Format<"uuid">>(),
      sessionId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert<ITodoUserSession>(session);
  TestValidator.predicate(
    "session.id is non-empty uuid string",
    typeof session.id === "string" && session.id.length > 0,
  );
  TestValidator.predicate(
    "session.todo_user_id matches uuid",
    typeof session.todo_user_id === "string" && session.todo_user_id.length > 0,
  );
  TestValidator.predicate(
    "session.ip is defined and string",
    typeof session.ip === "string",
  );
  TestValidator.predicate(
    "session.href is string",
    typeof session.href === "string",
  );
  TestValidator.predicate(
    "session.referrer is string",
    typeof session.referrer === "string",
  );
  TestValidator.predicate(
    "session.created_at is non-empty string",
    typeof session.created_at === "string" && session.created_at.length > 0,
  );
  if (session.expired_at !== null && session.expired_at !== undefined) {
    TestValidator.predicate(
      "session.expired_at is string when expired",
      typeof session.expired_at === "string" && session.expired_at.length > 0,
    );
  }

  // 3. Simulate expired session: set expired_at, check retrieval
  // For simulate mode, generate a session with expired_at set (typia.random)
  const expiredSession: ITodoUserSession = {
    ...typia.random<ITodoUserSession>(),
    expired_at: new Date().toISOString(),
  };
  // Simulate retrieval with known values in simulate mode
  const expiredSessionResult = await api.functional.todo.users.sessions.at(
    simulatedConnection,
    {
      userId: expiredSession.todo_user_id,
      sessionId: expiredSession.id,
    },
  );
  typia.assert<ITodoUserSession>(expiredSessionResult);
  TestValidator.equals(
    "expired_at matches forced value on expired session",
    expiredSessionResult.expired_at,
    expiredSession.expired_at,
  );
}
