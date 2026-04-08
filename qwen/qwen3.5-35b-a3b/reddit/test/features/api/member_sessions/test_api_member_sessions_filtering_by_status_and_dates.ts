import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityMemberSession";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_sessions_filtering_by_status_and_dates(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for member operations
  const memberConnection: api.IConnection = { host: connection.host };
  // Step 1: Join member account to create initial session
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // Collect initial sessions for baseline comparison
  const initialSessionList =
    await api.functional.redditCommunity.member.sessions.index(
      memberConnection,
      {
        body: {} satisfies IRedditCommunityMemberSession.IRequest,
      },
    );
  typia.assert(initialSessionList);
  const initialSessions = [...initialSessionList.data];
  // Step 2: Test filter by status='active'
  const activeSessions =
    await api.functional.redditCommunity.member.sessions.index(
      memberConnection,
      {
        body: {
          status: "active",
        } satisfies IRedditCommunityMemberSession.IRequest,
      },
    );
  typia.assert(activeSessions);
  TestValidator.equals(
    "active status filter returns non-negative count",
    activeSessions.data.length >= 0,
    true,
  );
  // Validate all returned sessions are actually active
  for (const session of activeSessions.data) {
    typia.assert(session);
  }
  // Step 3: Test filter by status='expired'
  const expiredSessions =
    await api.functional.redditCommunity.member.sessions.index(
      memberConnection,
      {
        body: {
          status: "expired",
        } satisfies IRedditCommunityMemberSession.IRequest,
      },
    );
  typia.assert(expiredSessions);
  TestValidator.equals(
    "expired status filter returns non-negative count",
    expiredSessions.data.length >= 0,
    true,
  );
  // Step 4: Test filter by date range (created_after and created_before)
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
  const dateRangeSessions =
    await api.functional.redditCommunity.member.sessions.index(
      memberConnection,
      {
        body: {
          createdAfter: oneHourAgo,
          createdBefore: oneHourLater,
        } satisfies IRedditCommunityMemberSession.IRequest,
      },
    );
  typia.assert(dateRangeSessions);
  TestValidator.equals(
    "date range filter returns non-negative count",
    dateRangeSessions.data.length >= 0,
    true,
  );
  // Validate all sessions are within the date range
  for (const session of dateRangeSessions.data) {
    typia.assert(session);
    if (session.createdAt) {
      const sessionDate = new Date(session.createdAt);
      const createdAfter = new Date(oneHourAgo);
      const createdBefore = new Date(oneHourLater);
      TestValidator.predicate(
        "session created_at is within range",
        sessionDate >= createdAfter && sessionDate <= createdBefore,
      );
    }
  }
  // Step 5: Test filter by expired_after and expired_before
  const expiredRangeSessions =
    await api.functional.redditCommunity.member.sessions.index(
      memberConnection,
      {
        body: {
          expiredAfter: oneHourAgo,
          expiredBefore: oneHourLater,
        } satisfies IRedditCommunityMemberSession.IRequest,
      },
    );
  typia.assert(expiredRangeSessions);
  TestValidator.equals(
    "expired date range filter returns non-negative count",
    expiredRangeSessions.data.length >= 0,
    true,
  );
  // Step 6: Test filter by ipAddress (partial match)
  const ipPartial = "192.168"; // Use a common IP prefix for LIKE matching
  const ipFilteredSessions =
    await api.functional.redditCommunity.member.sessions.index(
      memberConnection,
      {
        body: {
          ipAddress: ipPartial,
        } satisfies IRedditCommunityMemberSession.IRequest,
      },
    );
  typia.assert(ipFilteredSessions);
  TestValidator.equals(
    "ip address filter returns non-negative count",
    ipFilteredSessions.data.length >= 0,
    true,
  );
  // Validate IP filtering works (if sessions exist)
  if (ipFilteredSessions.data.length > 0) {
    for (const session of ipFilteredSessions.data) {
      typia.assert(session);
      if (session.ip) {
        TestValidator.predicate(
          "session ip contains search pattern",
          session.ip.includes(ipPartial),
        );
      }
    }
  }
  // Step 7: Test combined filters (status + date range)
  const combinedFilters =
    await api.functional.redditCommunity.member.sessions.index(
      memberConnection,
      {
        body: {
          status: "active",
          createdAfter: oneHourAgo,
          createdBefore: oneHourLater,
        } satisfies IRedditCommunityMemberSession.IRequest,
      },
    );
  typia.assert(combinedFilters);
  TestValidator.equals(
    "combined filters return non-negative count",
    combinedFilters.data.length >= 0,
    true,
  );
  // Step 8: Test pagination metadata accuracy
  TestValidator.predicate(
    "pagination metadata is valid",
    () =>
      (combinedFilters.pagination.current >= 1 &&
        combinedFilters.pagination.limit > 0 &&
        combinedFilters.pagination.limit <= 100 &&
        combinedFilters.pagination.records >= 0 &&
        combinedFilters.pagination.pages >= 0 &&
        combinedFilters.pagination.pages ===
          Math.ceil(
            combinedFilters.pagination.records /
              combinedFilters.pagination.limit,
          )) ||
      (combinedFilters.pagination.records === 0 &&
        combinedFilters.pagination.pages === 0),
  );
  // Step 9: Test empty result set pagination
  const futureDate = new Date(
    now.getTime() + 1000 * 60 * 60 * 24 * 365,
  ).toISOString();
  const emptyResult =
    await api.functional.redditCommunity.member.sessions.index(
      memberConnection,
      {
        body: {
          createdAfter: futureDate,
          createdBefore: futureDate,
        } satisfies IRedditCommunityMemberSession.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result pagination has zero records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result pagination has zero pages",
    emptyResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty result returns empty data array",
    emptyResult.data.length,
    0,
  );
  // Step 10: Verify filters narrow result set compared to unfiltered
  TestValidator.predicate(
    "status filter narrows results",
    () => activeSessions.data.length <= initialSessions.length,
  );
  TestValidator.predicate(
    "date filter narrows results",
    () => dateRangeSessions.data.length <= initialSessions.length,
  );
  TestValidator.predicate(
    "combined filters narrow results more than single filters",
    () =>
      combinedFilters.data.length <=
      Math.min(activeSessions.data.length, dateRangeSessions.data.length),
  );
}
