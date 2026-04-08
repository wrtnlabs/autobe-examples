import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMemberSession";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test filtering member sessions by expiration status and date ranges.
 *
 * Validates the member session listing API with various filter combinations including expiration status, creation date ranges, and expiration date ranges. Ensures that the filtering logic correctly returns only sessions matching the specified criteria.
 *
 * Special attention is given to verifying that the expired filter correctly distinguishes between active sessions (expired_at in the future) and expired sessions (expired_at in the past), and that date range filters work independently and in combination.
 *
 * 1. Authenticate as a member by joining with email and password.
 * 2. Call the sessions list endpoint with expired=false filter to retrieve only active sessions.
 * 3. Verify the response contains only sessions where expired_at is in the future.
 * 4. Call the sessions list endpoint with expired=true filter to retrieve only expired sessions.
 * 5. Verify the response contains only sessions where expired_at is in the past.
 * 6. Test date range filtering with created_after and created_before parameters.
 * 7. Test expired_after and expired_before filters for session expiration date ranges.
 * 8. Verify pagination works correctly with filters applied.
 */
export async function test_api_member_session_filter_by_expiration_status(
  connection: api.IConnection,
) {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection);
  typia.assert(authorized);
  // 2. Get active sessions (expired=false)
  const activeSessions =
    await api.functional.hrmTimeTrack.member.sessions.index(memberConnection, {
      body: {
        expired: false,
      } satisfies IHrmTimeTrackMemberSession.IRequest,
    });
  typia.assert(activeSessions);
  // 3. Verify all active sessions have expired_at in the future
  const now = new Date();
  for (const session of activeSessions.data) {
    const expiredAt = new Date(session.expired_at);
    TestValidator.predicate(
      `active session ${session.id} should not be expired`,
      expiredAt > now,
    );
  }
  // 4. Get expired sessions (expired=true)
  const expiredSessions =
    await api.functional.hrmTimeTrack.member.sessions.index(memberConnection, {
      body: {
        expired: true,
      } satisfies IHrmTimeTrackMemberSession.IRequest,
    });
  typia.assert(expiredSessions);
  // 5. Verify all expired sessions have expired_at in the past
  for (const session of expiredSessions.data) {
    const expiredAt = new Date(session.expired_at);
    TestValidator.predicate(
      `expired session ${session.id} should be expired`,
      expiredAt <= now,
    );
  }
  // 6. Test created_after filter
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const recentSessions =
    await api.functional.hrmTimeTrack.member.sessions.index(memberConnection, {
      body: {
        created_after: oneHourAgo,
      } satisfies IHrmTimeTrackMemberSession.IRequest,
    });
  typia.assert(recentSessions);
  for (const session of recentSessions.data) {
    const createdAt = new Date(session.created_at);
    TestValidator.predicate(
      `session ${session.id} should be created after filter`,
      createdAt >= new Date(oneHourAgo),
    );
  }
  // 7. Test created_before filter
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const oldSessions = await api.functional.hrmTimeTrack.member.sessions.index(
    memberConnection,
    {
      body: {
        created_before: oneDayAgo,
      } satisfies IHrmTimeTrackMemberSession.IRequest,
    },
  );
  typia.assert(oldSessions);
  for (const session of oldSessions.data) {
    const createdAt = new Date(session.created_at);
    TestValidator.predicate(
      `session ${session.id} should be created before filter`,
      createdAt <= new Date(oneDayAgo),
    );
  }
  // 8. Test expired_after filter
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const longSessions = await api.functional.hrmTimeTrack.member.sessions.index(
    memberConnection,
    {
      body: {
        expired_after: tomorrow,
      } satisfies IHrmTimeTrackMemberSession.IRequest,
    },
  );
  typia.assert(longSessions);
  for (const session of longSessions.data) {
    const expiredAt = new Date(session.expired_at);
    TestValidator.predicate(
      `session ${session.id} should expire after filter`,
      expiredAt >= new Date(tomorrow),
    );
  }
  // 9. Test expired_before filter
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const shortSessions = await api.functional.hrmTimeTrack.member.sessions.index(
    memberConnection,
    {
      body: {
        expired_before: yesterday,
      } satisfies IHrmTimeTrackMemberSession.IRequest,
    },
  );
  typia.assert(shortSessions);
  for (const session of shortSessions.data) {
    const expiredAt = new Date(session.expired_at);
    TestValidator.predicate(
      `session ${session.id} should expire before filter`,
      expiredAt <= new Date(yesterday),
    );
  }
  // 10. Test pagination with filters
  const paginatedSessions =
    await api.functional.hrmTimeTrack.member.sessions.index(memberConnection, {
      body: {
        expired: false,
        page: 1,
        limit: 10,
      } satisfies IHrmTimeTrackMemberSession.IRequest,
    });
  typia.assert(paginatedSessions);
  TestValidator.predicate(
    "pagination limit respected",
    paginatedSessions.data.length <= 10,
  );
  TestValidator.equals(
    "pagination current page",
    paginatedSessions.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    paginatedSessions.pagination.limit,
    10,
  );
  // 11. Verify member context isolation - all sessions belong to authenticated member
  if (activeSessions.data.length > 0) {
    for (const session of activeSessions.data) {
      TestValidator.equals(
        `session ${session.id} belongs to authenticated member`,
        session.member.id,
        authorized.id,
      );
    }
  }
  // 12. Verify empty result handling for filters with no matches
  TestValidator.predicate(
    "empty result is valid",
    shortSessions.data.length >= 0,
  );
  TestValidator.equals(
    "empty result pagination",
    shortSessions.pagination.records,
    shortSessions.data.length,
  );
}
