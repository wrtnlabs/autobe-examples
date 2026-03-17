import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that a member can filter their session list to show only active (non-expired) sessions.
 *
 * This test verifies:
 * 1. The active filter correctly excludes expired sessions
 * 2. All returned sessions have expired_at > current timestamp
 * 3. At least one active session exists (the current session)
 * 4. Pagination works correctly with the filter
 */
export async function test_api_member_sessions_active_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Get sessions with active filter (only non-expired sessions)
  const activeSessions =
    await api.functional.communityPlatform.member.sessions.index(
      memberConnection,
      {
        body: {
          active: true,
        } satisfies ICommunityPlatformMemberSession.IRequest,
      },
    );
  typia.assert(activeSessions);
  // 3. Verify all returned sessions are active (expired_at > current time)
  const now = new Date();
  for (const session of activeSessions.data) {
    const expiredAt = new Date(session.expired_at);
    TestValidator.predicate(
      `session ${session.id} should be active (not expired)`,
      expiredAt > now,
    );
  }
  // 4. Verify pagination metadata exists
  TestValidator.predicate(
    "pagination should have valid structure",
    activeSessions.pagination.current >= 1 &&
      activeSessions.pagination.limit >= 1 &&
      activeSessions.pagination.records >= 0 &&
      activeSessions.pagination.pages >= 0,
  );
  // 5. Get all sessions (without active filter) for comparison
  const allSessions =
    await api.functional.communityPlatform.member.sessions.index(
      memberConnection,
      {
        body: {} satisfies ICommunityPlatformMemberSession.IRequest,
      },
    );
  typia.assert(allSessions);
  // 6. Verify active filter excludes expired sessions
  // Active sessions count should be <= all sessions count
  TestValidator.predicate(
    "active sessions count should be less than or equal to all sessions",
    activeSessions.pagination.records <= allSessions.pagination.records,
  );
  // 7. Verify at least one active session exists for the newly authenticated member
  // Since the member just authenticated, they should have at least one active session
  TestValidator.predicate(
    "newly authenticated member should have at least one active session",
    activeSessions.data.length >= 1,
  );
}
