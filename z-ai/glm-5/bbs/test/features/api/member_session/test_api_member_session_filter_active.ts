import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_session_filter_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member and authenticate to generate an active session
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {});
  typia.assert(authResult);
  // 2. Query sessions with status='active' filter
  const activeSessions =
    await api.functional.discussionBoard.member.sessions.index(
      memberConnection,
      {
        body: {
          status: "active",
        } satisfies IDiscussionBoardMemberSession.IRequest,
      },
    );
  typia.assert(activeSessions);
  // 3. Verify all returned sessions have expired_at in the future (active sessions)
  const now = new Date();
  for (const session of activeSessions.data) {
    const expiredAt = new Date(session.expired_at);
    TestValidator.predicate(
      "active session should have future expiry",
      expiredAt > now,
    );
  }
  // 4. Test pagination with status filter
  const paginatedResult =
    await api.functional.discussionBoard.member.sessions.index(
      memberConnection,
      {
        body: {
          status: "active",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardMemberSession.IRequest,
      },
    );
  typia.assert(paginatedResult);
  // 5. Verify pagination structure
  TestValidator.equals(
    "pagination current page",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit respected",
    paginatedResult.data.length <= 5,
  );
  // 6. Query expired sessions to verify filter excludes them from active results
  const expiredSessions =
    await api.functional.discussionBoard.member.sessions.index(
      memberConnection,
      {
        body: {
          status: "expired",
        } satisfies IDiscussionBoardMemberSession.IRequest,
      },
    );
  typia.assert(expiredSessions);
  // 7. Verify all expired sessions have expired_at in the past
  for (const session of expiredSessions.data) {
    const expiredAt = new Date(session.expired_at);
    TestValidator.predicate(
      "expired session should have past expiry",
      expiredAt <= now,
    );
  }
  // 8. Verify no overlap between active and expired sessions
  const activeIds = new Set(activeSessions.data.map((s) => s.id));
  for (const expiredSession of expiredSessions.data) {
    TestValidator.predicate(
      "expired session should not appear in active results",
      !activeIds.has(expiredSession.id),
    );
  }
}
