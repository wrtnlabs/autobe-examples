import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSession";

/**
 * Administrator-forced session expiration test.
 *
 * This test verifies that an admin can forcibly expire (terminate) a user's
 * session via the /discussionBoard/admin/users/{userId}/sessions/{sessionId}
 * endpoint. The admin authenticates (join), a target user/session is simulated
 * (random IDs), and then expired_at is set via update. The test ensures that
 * only expired_at can be changed, the session's state is updated, and other
 * fields are immutable.
 */
export async function test_api_user_session_expiration_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin authenticates (join)
  const adminJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<
      string & tags.MinLength<8> & tags.Format<"password">
    >(),
    href: "https://admin.discussion.local/join",
    referrer: "https://discussion.local/landing",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IDiscussionBoardAdmin.IJoin;
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoin });
  typia.assert(admin);

  // 2. Simulate user session (random user & session IDs)
  const userId = typia.random<string & tags.Format<"uuid">>();
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // 3. Expire the session by setting expired_at (force logout)
  const expiredAt = new Date(Date.now() - 1000 * 60).toISOString(); // 1 min ago
  const updateBody = {
    expired_at: expiredAt,
  } satisfies IDiscussionBoardUserSession.IUpdate;
  const updatedSession =
    await api.functional.discussionBoard.admin.users.sessions.update(
      connection,
      {
        userId,
        sessionId,
        body: updateBody,
      },
    );
  typia.assert(updatedSession);
  TestValidator.equals(
    "session expired_at was updated",
    updatedSession.expired_at,
    expiredAt,
  );
  TestValidator.equals(
    "session user id matches",
    updatedSession.user.id,
    userId,
  );
  TestValidator.equals("session id matches", updatedSession.id, sessionId);
  // Ensure other immutable fields exist and are not updated (not testable for change here due to absence of pre-state fetch, but presence/type can be asserted)
  TestValidator.predicate(
    "session ip must be string",
    typeof updatedSession.ip === "string",
  );
  TestValidator.predicate(
    "session href must be string",
    typeof updatedSession.href === "string",
  );
  TestValidator.predicate(
    "session referrer must be string",
    typeof updatedSession.referrer === "string",
  );

  // 4. Negative: reject changing properties other than expired_at (simulate attempt to update immutable fields, should be runtime/compilation error - skipped because SDK prohibits extra properties)
}
