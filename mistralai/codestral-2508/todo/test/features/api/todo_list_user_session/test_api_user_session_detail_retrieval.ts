import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

export async function test_api_user_session_detail_retrieval(
  connection: api.IConnection,
) {
  /**
   * Test plan:
   *
   * 1. Generate random session and user IDs (UUID format) for input.
   * 2. (Mockup only) Try retrieving a session detail with given userId and
   *    sessionId using the endpoint.
   * 3. Validate the response structure and formats for all fields.
   * 4. Simulate success case: if session returned, check linkage (matching userId)
   *    and formats of id, timestamps, etc.
   * 5. Simulate expired session: manually set expired_at and check for correct
   *    value in response.
   * 6. Negative test: generate non-existent sessionId and expect API error on
   *    retrieval.
   * 7. Negative test: retrieve a session with mismatched userId (non-owner),
   *    expect error.
   */

  // 1. Create random user ID and session ID (UUID format)
  const userId = typia.random<string & tags.Format<"uuid">>();
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // 2. Retrieve the session detail (success for existing session)
  const session: ITodoListUserSession =
    await api.functional.todoList.users.sessions.at(connection, {
      userId,
      sessionId,
    });
  typia.assert(session);

  // 3. Validate linkage and field formats
  TestValidator.equals(
    "userId linkage matches",
    session.todo_list_user_id,
    userId,
  );
  TestValidator.predicate(
    "session.id is uuid",
    typeof session.id === "string" && session.id.length === 36,
  );
  TestValidator.predicate("ip is string", typeof session.ip === "string");
  TestValidator.predicate("href is string", typeof session.href === "string");
  TestValidator.predicate(
    "referrer is string",
    typeof session.referrer === "string",
  );
  TestValidator.predicate(
    "created_at is ISO date string",
    typeof session.created_at === "string" && /T.*Z$/.test(session.created_at),
  );
  // expired_at can be null/undefined (active) or ISO string (expired)
  if (session.expired_at !== null && session.expired_at !== undefined) {
    TestValidator.predicate(
      "expired_at is ISO date string if present",
      typeof session.expired_at === "string" &&
        /T.*Z$/.test(session.expired_at),
    );
  }

  // 4. Negative: retrieve with non-existent sessionId
  await TestValidator.error(
    "retrieving a non-existent session throws",
    async () => {
      await api.functional.todoList.users.sessions.at(connection, {
        userId,
        sessionId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // 5. Negative: attempt access using wrong userId
  await TestValidator.error(
    "cannot retrieve another user's session",
    async () => {
      await api.functional.todoList.users.sessions.at(connection, {
        userId: typia.random<string & tags.Format<"uuid">>(),
        sessionId,
      });
    },
  );
}
