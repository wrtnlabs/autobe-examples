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
 * Test that members can filter their sessions by status (active, expired, terminated).
 *
 * Business Rules:
 * - 'active' = expired_at > NOW() AND deleted_at IS NULL
 * - 'expired' = expired_at <= NOW() AND deleted_at IS NULL
 * - 'terminated' = deleted_at IS NOT NULL (soft-deleted sessions)
 * - Null status returns all session types
 */
export async function test_api_member_sessions_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account - creates an initial active session
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(8),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // 2. Query sessions with 'active' status filter
  const activeSessions =
    await api.functional.communityPlatform.member.sessions.index(
      memberConnection,
      {
        body: {
          status: "active",
        } satisfies ICommunityPlatformMemberSession.IRequest,
      },
    );
  typia.assert(activeSessions);
  // Validate active sessions - all must have deletedAt null and expiredAt in future
  const now = new Date();
  for (const session of activeSessions.data) {
    TestValidator.predicate(
      "active session has null deletedAt",
      session.deletedAt === null,
    );
    TestValidator.predicate(
      "active session has expiredAt in future",
      new Date(session.expiredAt) > now,
    );
  }
  // 3. Query sessions with 'expired' status filter
  const expiredSessions =
    await api.functional.communityPlatform.member.sessions.index(
      memberConnection,
      {
        body: {
          status: "expired",
        } satisfies ICommunityPlatformMemberSession.IRequest,
      },
    );
  typia.assert(expiredSessions);
  // Validate expired sessions - all must have deletedAt null and expiredAt in past
  for (const session of expiredSessions.data) {
    TestValidator.predicate(
      "expired session has null deletedAt",
      session.deletedAt === null,
    );
    TestValidator.predicate(
      "expired session has expiredAt in past",
      new Date(session.expiredAt) <= now,
    );
  }
  // 4. Query sessions with 'terminated' status filter
  const terminatedSessions =
    await api.functional.communityPlatform.member.sessions.index(
      memberConnection,
      {
        body: {
          status: "terminated",
        } satisfies ICommunityPlatformMemberSession.IRequest,
      },
    );
  typia.assert(terminatedSessions);
  // Validate terminated sessions - all must have deletedAt not null
  for (const session of terminatedSessions.data) {
    TestValidator.predicate(
      "terminated session has non-null deletedAt",
      session.deletedAt !== null,
    );
  }
  // 5. Query sessions with no status filter (null) - should return all sessions
  const allSessions =
    await api.functional.communityPlatform.member.sessions.index(
      memberConnection,
      {
        body: {
          status: null,
        } satisfies ICommunityPlatformMemberSession.IRequest,
      },
    );
  typia.assert(allSessions);
  // Validate that null status returns all session types (union of active, expired, terminated)
  const activeCount = activeSessions.pagination.records;
  const expiredCount = expiredSessions.pagination.records;
  const terminatedCount = terminatedSessions.pagination.records;
  const totalCount = allSessions.pagination.records;
  TestValidator.equals(
    "total sessions equals sum of all status counts",
    totalCount,
    activeCount + expiredCount + terminatedCount,
  );
  // 6. Validate pagination works correctly
  TestValidator.predicate(
    "active sessions pagination current page is valid",
    activeSessions.pagination.current >= 1,
  );
  TestValidator.predicate(
    "active sessions pagination limit is valid",
    activeSessions.pagination.limit >= 1,
  );
  // 7. Verify that the session from join appears in active sessions
  TestValidator.predicate(
    "newly created session appears in active sessions",
    activeSessions.data.length >= 1,
  );
}
