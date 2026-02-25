import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSessionStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSessionStatus";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test session status computation (active vs expired) through expiration date filtering.
 *
 * Workflow:
 * 1. User authenticates via join creating a new session
 * 2. Query sessions filtering by expired_at ranges to distinguish active vs expired
 * 3. Validate status field computed correctly based on expiration timestamp
 */
export async function test_api_session_status_active_expired(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for user
  const userConnection: api.IConnection = { host: connection.host };
  // 1. User authenticates via join creating a new session
  const authorized = await authorize_user_join(userConnection, {});
  typia.assert(authorized);
  const now = new Date();
  const nowISO = now.toISOString();
  // 2. Query active sessions for the newly created user
  // Sessions with expired_at > NOW should have status 'active'
  const activeSessions =
    await api.functional.discussionBoard.user.sessions.index(userConnection, {
      body: {
        discussion_board_user_id: authorized.id,
        expired_at_from: nowISO,
        sort: "created_at-desc",
      } satisfies IDiscussionBoardUserSession.IRequest,
    });
  typia.assert(activeSessions);
  // 3. Find the newly created session
  const newSession = activeSessions.data.find(
    (session) => session.user.id === authorized.id,
  );
  // 4. Validate the newly created session exists and has active status
  TestValidator.predicate("new session should exist", newSession !== undefined);
  TestValidator.equals(
    "new session status should be active",
    newSession!.status,
    "active",
  );
  TestValidator.predicate(
    "new session should expire in the future",
    new Date(newSession!.expired_at) > now,
  );
  // 5. Validate all sessions expiring after NOW have 'active' status
  for (const session of activeSessions.data) {
    TestValidator.equals("active session status", session.status, "active");
  }
  // 6. Query expired sessions (using past date filter)
  const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const expiredSessions =
    await api.functional.discussionBoard.user.sessions.index(userConnection, {
      body: {
        discussion_board_user_id: authorized.id,
        expired_at_to: pastDate.toISOString(),
        sort: "created_at-desc",
      } satisfies IDiscussionBoardUserSession.IRequest,
    });
  typia.assert(expiredSessions);
  // 7. Validate all sessions in expired range have 'expired' status
  for (const session of expiredSessions.data) {
    TestValidator.equals("expired session status", session.status, "expired");
  }
  // 8. Validate date range filtering works correctly
  const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const rangeSessions =
    await api.functional.discussionBoard.user.sessions.index(userConnection, {
      body: {
        discussion_board_user_id: authorized.id,
        expired_at_from: nowISO,
        expired_at_to: futureDate.toISOString(),
        sort: "created_at-desc",
      } satisfies IDiscussionBoardUserSession.IRequest,
    });
  typia.assert(rangeSessions);
  // 9. Sessions within future expiration range should have 'active' status
  for (const session of rangeSessions.data) {
    TestValidator.equals(
      "session in future range status",
      session.status,
      "active",
    );
  }
}
