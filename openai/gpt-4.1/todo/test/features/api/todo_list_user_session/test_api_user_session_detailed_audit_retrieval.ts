import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

/**
 * Verify detailed audit/session retrieval with valid/invalid user-session
 * linkage.
 *
 * 1. Prepare a mock session record (random UUIDs for userId and sessionId)
 * 2. Call api.functional.todoList.users.sessions.at with these parameters
 * 3. Assert full ITodoListUserSession shape and all fields using typia.assert()
 * 4. Validate returned object's todo_list_user_id === userId; id === sessionId
 * 5. Validate ip, href, referrer, created_at are all non-empty (string, date-time
 *    as appropriate)
 * 6. (Edge case) Call with correct sessionId but mismatched userId; confirm error
 *    or forbidden
 */
export async function test_api_user_session_detailed_audit_retrieval(
  connection: api.IConnection,
) {
  // 1. Generate random but valid userId and sessionId
  const userId = typia.random<string & tags.Format<"uuid">>();
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // 2. Success case: retrieve session by correct linkage
  const session: ITodoListUserSession =
    await api.functional.todoList.users.sessions.at(connection, {
      userId,
      sessionId,
    });
  typia.assert(session);
  TestValidator.equals(
    "session.user linkage correct",
    session.todo_list_user_id,
    userId,
  );
  TestValidator.equals("session.id matches sessionId", session.id, sessionId);
  TestValidator.predicate(
    "session IP provided",
    typeof session.ip === "string" && session.ip.length > 0,
  );
  TestValidator.predicate(
    "href provided",
    typeof session.href === "string" && session.href.length > 0,
  );
  TestValidator.predicate(
    "referrer always string",
    typeof session.referrer === "string",
  );
  TestValidator.predicate(
    "created_at date-time string",
    typeof session.created_at === "string" && session.created_at.length > 0,
  );

  // 3. Edge case: attempt lookup with correct sessionId but wrong userId
  const wrongUserId = typia.random<string & tags.Format<"uuid">>();
  if (wrongUserId !== userId) {
    await TestValidator.error(
      "denies access/session not belonging to user",
      async () => {
        await api.functional.todoList.users.sessions.at(connection, {
          userId: wrongUserId,
          sessionId,
        });
      },
    );
  }
}
